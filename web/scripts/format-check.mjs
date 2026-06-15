import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { collectQualityFiles, toRelativePath } from "./project-files.mjs";

function hasFinalNewline(content) {
  return content.endsWith("\n");
}

export function normalizeFormatting(content) {
  const normalizedLineEndings = content.replace(/\r\n?/g, "\n");
  const withoutTrailingWhitespace = normalizedLineEndings
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");

  return `${withoutTrailingWhitespace.replace(/\n*$/g, "")}\n`;
}

export function getFormattingIssues(content) {
  const issues = [];

  if (content.includes("\r")) {
    issues.push("usa quebra de linha nao padronizada");
  }

  if (!hasFinalNewline(content)) {
    issues.push("nao termina com nova linha");
  }

  content.split(/\n/).forEach((line, index) => {
    const lineWithoutCarriageReturn = line.replace(/\r$/g, "");

    if (/[ \t]+$/.test(lineWithoutCarriageReturn)) {
      issues.push(`possui espaco final na linha ${index + 1}`);
    }
  });

  return issues;
}

export function checkFormatting({ files = collectQualityFiles(), root, write = false } = {}) {
  const failures = [];

  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    const issues = getFormattingIssues(content);

    if (issues.length === 0) {
      return;
    }

    if (write) {
      fs.writeFileSync(filePath, normalizeFormatting(content));
      return;
    }

    failures.push({
      file: root ? toRelativePath(filePath, root) : toRelativePath(filePath),
      issues,
    });
  });

  return failures;
}

export function printFormattingFailures(failures) {
  failures.forEach((failure) => {
    console.error(`- ${failure.file}: ${failure.issues.join("; ")}`);
  });
}

export function runFormatCheck(argv = process.argv.slice(2)) {
  const write = argv.includes("--write");
  const failures = checkFormatting({ write });

  if (write) {
    console.log("Formatacao aplicada aos arquivos do front-end.");
    return 0;
  }

  if (failures.length > 0) {
    console.error("Formatacao inconsistente encontrada:");
    printFormattingFailures(failures);
    return 1;
  }

  console.log("Formatacao verificada sem inconsistencias.");
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runFormatCheck();
}
