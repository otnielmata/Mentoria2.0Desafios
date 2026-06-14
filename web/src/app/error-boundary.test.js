import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function readAppFile(name) {
  return fs.readFileSync(path.join(appRoot, name), "utf8");
}

describe("app error boundaries", () => {
  it("mantem fallback de erro inesperado sem expor stack tecnica", () => {
    const source = readAppFile("error.js");

    expect(source).toContain("ErrorFallback");
    expect(source).toContain("logError");
    expect(source).toContain("render.error");
    expect(source).not.toContain("error.stack");
  });

  it("mantem fallback global para erros de layout raiz", () => {
    const source = readAppFile("global-error.js");

    expect(source).toContain("<html lang=\"pt-BR\">");
    expect(source).toContain("ErrorFallback");
    expect(source).toContain("logError");
    expect(source).toContain("render.global_error");
    expect(source).not.toContain("error.stack");
  });

  it("mantem loading global de rota", () => {
    const source = readAppFile("loading.js");

    expect(source).toContain("LoadingState");
    expect(source).toContain("Carregando area...");
  });
});
