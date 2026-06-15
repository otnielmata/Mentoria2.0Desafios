import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/meus-desafios/page", () => {
  it("usa controller e estado assincrono sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getMyChallengeSubmissions");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).toContain("Tentar novamente");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza dados exigidos pela MR-73", () => {
    const source = readPage();

    expect(source).toContain("Meus desafios");
    expect(source).toContain("Historico de envios");
    expect(source).toContain("Data");
    expect(source).toContain("Tipo");
    expect(source).toContain("Status");
    expect(source).toContain("Ver detalhes");
  });

  it("exibe feedback do professor em detalhes de reprovado ou ajuste", () => {
    const source = readPage();

    expect(source).toContain("Feedback do professor");
    expect(source).toContain("reprovado");
    expect(source).toContain("ajuste");
  });
});
