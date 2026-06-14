import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/alunos/page", () => {
  it("usa controllers de usuarios e estados padronizados sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getUsers");
    expect(source).toContain("createUser");
    expect(source).toContain("useFormController");
    expect(source).toContain("AsyncStateView");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza campos e dados exigidos pela MR-79", () => {
    const source = readPage();

    expect(source).toContain("Alunos cadastrados");
    expect(source).toContain("Cadastrar aluno");
    expect(source).toContain("Nome");
    expect(source).toContain("E-mail");
    expect(source).toContain("Papel");
    expect(source).toContain("Status");
    expect(source).toContain("Turma");
    expect(source).toContain("Salvar aluno");
  });

  it("nao exibe campo de senha na listagem de alunos", () => {
    const source = readPage();

    expect(source.toLowerCase()).not.toContain("senha");
    expect(source.toLowerCase()).not.toContain("password");
  });
});
