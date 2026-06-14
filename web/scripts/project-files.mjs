import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const rootQualityFiles = [
  ".env.example",
  ".env.production.example",
  "README.md",
  "jsconfig.json",
  "next.config.js",
  "package.json",
  "vercel.json",
  "vitest.config.mjs",
];

export const sourceRoots = ["docs", "src", "scripts"];

const textExtensions = new Set([".css", ".js", ".json", ".md", ".mjs"]);

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

export function toRelativePath(filePath, root = webRoot) {
  return normalizePath(path.relative(root, filePath));
}

export function isTextQualityFile(filePath) {
  return textExtensions.has(path.extname(filePath));
}

export function walkDirectory(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkDirectory(entryPath);
    }

    return isTextQualityFile(entryPath) ? [entryPath] : [];
  });
}

export function collectQualityFiles(root = webRoot) {
  const rootFiles = rootQualityFiles
    .map((fileName) => path.join(root, fileName))
    .filter((filePath) => fs.existsSync(filePath));

  const sourceFiles = sourceRoots.flatMap((sourceRoot) => walkDirectory(path.join(root, sourceRoot)));

  return [...rootFiles, ...sourceFiles].sort();
}
