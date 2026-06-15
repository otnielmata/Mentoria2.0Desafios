import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/pilares/page", () => {
  it("usa controller de pilares e estados padronizados sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getPillars");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza listagem e detalhes exigidos pela MR-81", () => {
    const source = readPage();

    expect(source).toContain("Pilares cadastrados");
    expect(source).toContain("Ver detalhes");
    expect(source).toContain("descricao");
    expect(source).toContain("7 pilares");
  });

  it("orienta estado vazio sem recriar seed no front-end", () => {
    const source = readPage();

    expect(source).toContain("Configure os 7 pilares iniciais pela API/admin.");
    expect(source).not.toContain("POST");
    expect(source).not.toContain("createPillar");
  });
});
