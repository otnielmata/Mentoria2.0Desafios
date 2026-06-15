import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/meus-grupos/page", () => {
  it("usa controller de meus grupos e estados padronizados sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getMyGroups");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza os dados exigidos pela MR-88", () => {
    const source = readPage();

    expect(source).toContain("Meus grupos");
    expect(source).toContain("Desafio");
    expect(source).toContain("Pilar");
    expect(source).toContain("Responsavel");
    expect(source).toContain("Participantes");
    expect(source).toContain("Status");
    expect(source).toContain("Pontos");
    expect(source).toContain("Ranking");
    expect(source).toContain("Ver participantes");
    expect(source).toContain("Voce ainda nao participou de desafios em grupo.");
  });

  it("mantem a tela apenas de consulta de um endpoint", () => {
    const source = readPage();

    expect(source).not.toContain("onSubmit");
    expect(source).not.toContain("method=\"POST\"");
    expect(source).not.toContain("method=\"PATCH\"");
    expect(source).not.toContain("Cadastrar");
  });
});
