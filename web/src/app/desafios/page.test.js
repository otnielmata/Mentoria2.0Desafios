import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/desafios/page", () => {
  it("usa controllers e estados padronizados sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getChallenges");
    expect(source).toContain("createChallenge");
    expect(source).toContain("getPillars");
    expect(source).toContain("useFormController");
    expect(source).toContain("AsyncStateView");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza campos e dados exigidos pela MR-82", () => {
    const source = readPage();

    expect(source).toContain("Desafios cadastrados");
    expect(source).toContain("Cadastrar desafio");
    expect(source).toContain("Pilar");
    expect(source).toContain("Titulo");
    expect(source).toContain("Descricao");
    expect(source).toContain("Pontos");
    expect(source).toContain("Tipo");
    expect(source).toContain("Maximo de participantes");
    expect(source).toContain("Status");
    expect(source).toContain("Salvar desafio");
  });

  it("usa pilares da API e exibe pontuacao fixa", () => {
    const source = readPage();

    expect(source).toContain("Lista carregada dos pilares cadastrados na API.");
    expect(source).toContain("challenge.points");
    expect(source).not.toContain("pontuacaoPorDificuldade");
  });
});
