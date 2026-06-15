import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/grupos/page", () => {
  it("usa controller de grupos e estados padronizados sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getGroups");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza dados exigidos pela MR-84", () => {
    const source = readPage();

    expect(source).toContain("Grupos de envios");
    expect(source).toContain("Lider");
    expect(source).toContain("Participantes");
    expect(source).toContain("Status");
    expect(source).toContain("Ver participantes");
    expect(source).toContain("Ainda nao existem envios em grupo.");
  });

  it("mantem a tela apenas de consulta", () => {
    const source = readPage();

    expect(source).not.toContain("onSubmit");
    expect(source).not.toContain("method=\"POST\"");
    expect(source).not.toContain("method=\"PATCH\"");
    expect(source).not.toContain("Cadastrar");
  });
});
