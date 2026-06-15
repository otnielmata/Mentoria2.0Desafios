import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dashboardPagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readDashboardPage() {
  return fs.readFileSync(dashboardPagePath, "utf8");
}

describe("app/dashboard/page", () => {
  it("usa controller e estados assincronos para carregar dashboard do aluno", () => {
    const source = readDashboardPage();

    expect(source).toContain("getStudentDashboard");
    expect(source).toContain("getAdminDashboard");
    expect(source).toContain("AsyncStateView");
    expect(source).toContain("createAsyncStateFromResult");
    expect(source).toContain("Tentar novamente");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza os indicadores exigidos pela MR-71", () => {
    const source = readDashboardPage();

    expect(source).toContain("Pontos totais");
    expect(source).toContain("Ranking geral");
    expect(source).toContain("Desafios aprovados");
    expect(source).toContain("Desafios pendentes");
    expect(source).toContain("Pontuacao por pilar");
  });

  it("renderiza os indicadores exigidos pela MR-78 para professor e admin", () => {
    const source = readDashboardPage();

    expect(source).toContain("Dashboard geral");
    expect(source).toContain("Alunos ativos");
    expect(source).toContain("Total de envios");
    expect(source).toContain("Envios pendentes");
    expect(source).toContain("Alunos mais engajados");
    expect(source).toContain("Baixa participacao");
  });

  it("bloqueia dashboard admin para aluno ao escolher endpoint por role", () => {
    const source = readDashboardPage();

    expect(source).toContain("isAdminDashboardRole");
    expect(source).toContain("roles.teacher");
    expect(source).toContain("roles.admin");
    expect(source).toContain("isAdminDashboard ? await getAdminDashboard() : await getStudentDashboard()");
  });
});
