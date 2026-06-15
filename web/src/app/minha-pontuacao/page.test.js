import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/minha-pontuacao/page", () => {
  it("usa controller e estado assincrono sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getMyScore");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).toContain("Tentar novamente");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza os dados exigidos pela MR-74", () => {
    const source = readPage();

    expect(source).toContain("Minha pontuacao");
    expect(source).toContain("Pontos totais");
    expect(source).toContain("Pontuacao por pilar");
    expect(source).toContain("Historico de pontos");
    expect(source).toContain("Envio");
  });

  it("exibe estado vazio com orientacao para registrar desafios", () => {
    const source = readPage();

    expect(source).toContain("Voce ainda nao tem pontos aprovados");
    expect(source).toContain("Registrar desafio");
    expect(source).toContain("hasApprovedScore");
  });
});
