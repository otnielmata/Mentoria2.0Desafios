import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/turmas/page", () => {
  it("usa controllers de turmas e estados padronizados sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getClasses");
    expect(source).toContain("createClass");
    expect(source).toContain("useFormController");
    expect(source).toContain("AsyncStateView");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza campos e dados exigidos pela MR-80", () => {
    const source = readPage();

    expect(source).toContain("Turmas cadastradas");
    expect(source).toContain("Cadastrar turma");
    expect(source).toContain("Nome");
    expect(source).toContain("Data de inicio");
    expect(source).toContain("Data de fim");
    expect(source).toContain("Status");
    expect(source).toContain("Salvar turma");
  });

  it("nao adiciona logica de pontuacao na funcionalidade de turmas", () => {
    const source = readPage().toLowerCase();

    expect(source).not.toContain("pontuacao");
    expect(source).not.toContain("pontos");
  });
});
