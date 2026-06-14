import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/perfil/page", () => {
  it("usa controller e estado assincrono sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getProfile");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).toContain("Tentar novamente");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza dados cadastrais exigidos pela MR-76", () => {
    const source = readPage();

    expect(source).toContain("Meu perfil");
    expect(source).toContain("Nome");
    expect(source).toContain("E-mail");
    expect(source).toContain("Perfil");
    expect(source).toContain("Status");
  });

  it("nao renderiza campos sensiveis", () => {
    const source = readPage().toLowerCase();

    expect(source).not.toContain("password");
    expect(source).not.toContain("senha");
    expect(source).not.toContain("token");
    expect(source).not.toContain("secret");
    expect(source).not.toContain("segredo");
  });
});
