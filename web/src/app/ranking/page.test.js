import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/ranking/page", () => {
  it("usa controller e estado assincrono sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getGeneralRanking");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).toContain("Tentar novamente");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza os dados exigidos pela MR-75", () => {
    const source = readPage();

    expect(source).toContain("Ranking geral");
    expect(source).toContain("ranking-position");
    expect(source).toContain("studentName");
    expect(source).toContain("ranking-points");
  });

  it("destaca a posicao do usuario atual com texto acessivel", () => {
    const source = readPage();

    expect(source).toContain("isCurrentRankingEntry");
    expect(source).toContain("Sua posicao");
    expect(source).toContain("Esta e a sua posicao no ranking.");
    expect(source).toContain("aria-current");
  });

  it("trata ranking vazio ou indisponivel", () => {
    const source = readPage();

    expect(source).toContain("Ranking ainda nao possui participantes com pontos aprovados.");
    expect(source).toContain("unavailableMessage");
  });
});
