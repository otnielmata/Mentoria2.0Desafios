import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/configuracoes/page", () => {
  it("usa controller e estado assincrono sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getConfigurations");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza configuracoes em modo somente leitura", () => {
    const source = readPage();

    expect(source).toContain("Configuracoes");
    expect(source).toContain("Somente leitura");
    expect(source).toContain("Indisponivel");
    expect(source).toContain("Ranking geral");
    expect(source).toContain("Parametros disponiveis");
  });

  it("trata estado vazio sem prometer edicao", () => {
    const source = readPage();

    expect(source).toContain("Nenhuma configuracao disponivel para exibicao.");
    expect(source).not.toContain("Salvar");
    expect(source).not.toContain("Editar");
  });
});
