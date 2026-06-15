import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/aprovacoes/page", () => {
  it("usa controller de aprovacoes e estados padronizados sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("getChallengeApprovals");
    expect(source).toContain("reviewChallengeApproval");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createStatusFromResult");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza dados e acoes exigidos pela MR-83", () => {
    const source = readPage();

    expect(source).toContain("Envios pendentes");
    expect(source).toContain("Aluno");
    expect(source).toContain("Descricao");
    expect(source).toContain("Evidencias");
    expect(source).toContain("Aprovar");
    expect(source).toContain("Reprovar");
    expect(source).toContain("Solicitar ajuste");
    expect(source).toContain("Feedback para o aluno");
  });

  it("exibe evidencia por link sem baixar arquivo automaticamente", () => {
    const source = readPage();

    expect(source).toContain("target=\"_blank\"");
    expect(source).toContain("Abrir evidencia");
    expect(source).not.toContain("download=");
  });
});
