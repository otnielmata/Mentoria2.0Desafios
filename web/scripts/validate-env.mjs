import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const requiredPublicEnvKeys = ["NEXT_PUBLIC_API_BASE_URL"];
export const allowedPublicEnvKeys = ["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_APP_ENV"];
export const localDefaults = {
  NEXT_PUBLIC_API_BASE_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_ENV: "development",
};

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const secretPattern = /(SECRET|TOKEN|PASSWORD|PRIVATE|MONGODB|JWT|DATABASE)/i;

function cleanValue(value = "") {
  return String(value).trim().replace(/^['"]|['"]$/g, "");
}

export function parseEnvContent(content = "") {
  return content.split(/\n/).reduce((env, line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return env;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      return env;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = cleanValue(trimmedLine.slice(separatorIndex + 1));

    return {
      ...env,
      [key]: value,
    };
  }, {});
}

export function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return parseEnvContent(fs.readFileSync(filePath, "utf8"));
}

export function mergeEnvSources(...sources) {
  return Object.assign({}, ...sources);
}

export function getModeFromArgs(argv = []) {
  const modeArg = argv.find((arg) => arg.startsWith("--mode="));

  if (modeArg) {
    return modeArg.split("=")[1] || "development";
  }

  if (argv.includes("--production")) {
    return "production";
  }

  return process.env.NEXT_PUBLIC_APP_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

export function isProductionLikeMode(mode = "") {
  return ["production", "preview"].includes(mode);
}

export function validatePublicEnv(env = {}, { mode = "development" } = {}) {
  const issues = [];
  const effectiveEnv = isProductionLikeMode(mode) ? env : mergeEnvSources(localDefaults, env);

  requiredPublicEnvKeys.forEach((key) => {
    if (!effectiveEnv[key]) {
      issues.push({
        key,
        message: "defina esta variavel para a web consumir a API REST",
      });
    }
  });

  Object.keys(effectiveEnv).forEach((key) => {
    if (!key.startsWith("NEXT_PUBLIC_")) {
      return;
    }

    if (!allowedPublicEnvKeys.includes(key)) {
      issues.push({
        key,
        message: "variavel publica nao cadastrada na allowlist da web",
      });
    }

    if (secretPattern.test(key)) {
      issues.push({
        key,
        message: "segredos nao devem usar NEXT_PUBLIC_ nem ir para o bundle do cliente",
      });
    }
  });

  return issues;
}

export function loadLocalEnv(root = webRoot) {
  return mergeEnvSources(
    readEnvFile(path.join(root, ".env")),
    readEnvFile(path.join(root, ".env.local")),
    process.env
  );
}

export function printEnvIssues(issues) {
  issues.forEach((issue) => {
    console.error(`- ${issue.key}: ${issue.message}`);
  });
}

export function runEnvValidation(argv = process.argv.slice(2)) {
  const mode = getModeFromArgs(argv);
  const issues = validatePublicEnv(loadLocalEnv(), { mode });

  if (issues.length > 0) {
    console.error(`Ambiente web invalido para ${mode}:`);
    printEnvIssues(issues);
    return 1;
  }

  console.log(`Ambiente web validado para ${mode}.`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runEnvValidation();
}
