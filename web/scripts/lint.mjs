import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { collectQualityFiles, toRelativePath, webRoot } from "./project-files.mjs";

const requiredTestFiles = [
  "src/models/auth.model.test.js",
  "src/models/dashboard.model.test.js",
  "src/models/challenge-submission.model.test.js",
  "src/controllers/dashboard.controller.test.js",
  "src/controllers/challenge-submission.controller.test.js",
  "src/services/dashboard.service.test.js",
  "src/services/challenge-submission.service.test.js",
  "src/app/dashboard/page.test.js",
  "src/app/registrar-desafio/page.test.js",
  "src/config/access-control.test.js",
  "src/config/domain-pages.test.js",
  "src/models/form.model.test.js",
  "src/models/async-state.model.test.js",
  "src/services/api/client.test.js",
  "src/components/ui/ui-components.test.js",
];

const lintRules = [
  {
    id: "no-focused-tests",
    message: "remova testes focados antes de versionar",
    pattern: /\b(describe|it|test)\.only\s*\(/,
  },
  {
    id: "no-debugger",
    message: "remova instrucao debugger",
    pattern: /\bdebugger\b/,
  },
  {
    id: "no-console-log",
    message: "remova console.log/debug/warn do front-end",
    pattern: /console\.(log|debug|warn)\s*\(/,
  },
];

function isTestFile(relativePath) {
  return relativePath.endsWith(".test.js");
}

function isApplicationSource(relativePath) {
  return relativePath.startsWith("src/");
}

function shouldApplySourceRules(relativePath) {
  return isApplicationSource(relativePath);
}

function shouldApplyTestRules(relativePath) {
  return isApplicationSource(relativePath) || isTestFile(relativePath);
}

function canUseDirectFetch(relativePath) {
  return relativePath === "src/services/api/client.js" || isTestFile(relativePath);
}

function checkFileContent(filePath, root = webRoot) {
  const relativePath = toRelativePath(filePath, root);
  const content = fs.readFileSync(filePath, "utf8");
  const issues = [];

  lintRules.forEach((rule) => {
    const appliesToFile =
      rule.id === "no-focused-tests"
        ? shouldApplyTestRules(relativePath)
        : shouldApplySourceRules(relativePath);

    if (appliesToFile && rule.pattern.test(content)) {
      issues.push({ id: rule.id, message: rule.message });
    }
  });

  if (isApplicationSource(relativePath) && !canUseDirectFetch(relativePath) && /\bfetch\s*\(/.test(content)) {
    issues.push({
      id: "no-direct-fetch-outside-api-client",
      message: "use services/api/client.js para chamadas HTTP",
    });
  }

  return issues.map((issue) => ({
    ...issue,
    file: relativePath,
  }));
}

export function checkRequiredTestCoverage(root = webRoot) {
  return requiredTestFiles
    .filter((relativePath) => !fs.existsSync(`${root}/${relativePath}`))
    .map((relativePath) => ({
      file: relativePath,
      id: "missing-critical-test",
      message: "adicione teste unitario para fluxo critico inicial",
    }));
}

export function runLint({ files = collectQualityFiles(), root = webRoot } = {}) {
  return [
    ...files.flatMap((filePath) => checkFileContent(filePath, root)),
    ...checkRequiredTestCoverage(root),
  ];
}

export function printLintIssues(issues) {
  issues.forEach((issue) => {
    console.error(`- ${issue.file}: [${issue.id}] ${issue.message}`);
  });
}

export function runLintCli() {
  const issues = runLint();

  if (issues.length > 0) {
    console.error("Lint encontrou problemas criticos:");
    printLintIssues(issues);
    return 1;
  }

  console.log("Lint finalizado sem erros criticos.");
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runLintCli();
}
