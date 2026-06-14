import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function readArchitectureDoc() {
  return fs.readFileSync(path.join(docsRoot, "frontend-architecture.md"), "utf8");
}

describe("docs/frontend-architecture", () => {
  it("documenta estrutura de pastas e responsabilidades MVC", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app");
    expect(source).toContain("src/components");
    expect(source).toContain("src/controllers");
    expect(source).toContain("src/models");
    expect(source).toContain("src/services");
  });

  it("documenta fluxo de dados da view ate a API REST", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("View em src/app");
    expect(source).toContain("Controller em src/controllers");
    expect(source).toContain("Service em src/services");
    expect(source).toContain("NEXT_PUBLIC_API_BASE_URL");
  });

  it("documenta comandos, ambiente, endpoints e padroes de UI", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("npm run quality");
    expect(source).toContain("npm run deploy:check");
    expect(source).toContain("POST /api/auth/login");
    expect(source).toContain("POST /api/auth/register");
    expect(source).toContain("GET  /api/dashboard/aluno");
    expect(source).toContain("GET  /api/dashboard/admin");
    expect(source).toContain("POST /api/envios-desafios");
    expect(source).toContain("GET  /api/envios-desafios/meus");
    expect(source).toContain("GET  /api/pontuacoes/minha");
    expect(source).toContain("GET  /api/ranking");
    expect(source).toContain("GET  /api/users/me");
    expect(source).toContain("Tema e UI");
    expect(source).toContain("Componentes base atuais");
  });

  it("documenta o fluxo do dashboard do aluno", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/dashboard/page.js");
    expect(source).toContain("getStudentDashboard");
    expect(source).toContain("toStudentDashboardDto");
    expect(source).toContain("getStudentDashboardRequest");
  });

  it("documenta o fluxo do dashboard admin", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("Dashboard admin");
    expect(source).toContain("getAdminDashboard");
    expect(source).toContain("toAdminDashboardDto");
    expect(source).toContain("getAdminDashboardRequest");
    expect(source).toContain("front-end nao calcula indicadores");
  });

  it("documenta o fluxo de registro de desafio", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/registrar-desafio/page.js");
    expect(source).toContain("submitChallengeSubmission");
    expect(source).toContain("validateChallengeSubmissionPayload");
    expect(source).toContain("submitChallengeSubmissionRequest");
  });

  it("documenta o fluxo de meus desafios", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/meus-desafios/page.js");
    expect(source).toContain("getMyChallengeSubmissions");
    expect(source).toContain("toMyChallengeSubmissionsDto");
    expect(source).toContain("getMyChallengeSubmissionsRequest");
  });

  it("documenta o fluxo de minha pontuacao", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/minha-pontuacao/page.js");
    expect(source).toContain("getMyScore");
    expect(source).toContain("toMyScoreDto");
    expect(source).toContain("getMyScoreRequest");
    expect(source).toContain("front-end nao soma pontuacoes");
  });

  it("documenta o fluxo de ranking geral", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/ranking/page.js");
    expect(source).toContain("getGeneralRanking");
    expect(source).toContain("toRankingDto");
    expect(source).toContain("getGeneralRankingRequest");
    expect(source).toContain("front-end nao recalcula classificacao");
  });

  it("documenta o fluxo de meu perfil", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/perfil/page.js");
    expect(source).toContain("getProfile");
    expect(source).toContain("toProfileDto");
    expect(source).toContain("getProfileRequest");
    expect(source).toContain("descarta campos sensiveis");
  });

  it("documenta menus por perfil sem endpoint novo", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("Menus por perfil");
    expect(source).toContain("Nenhum endpoint novo");
    expect(source).toContain("Aluno: Inicio, Registrar Desafio, Meus Desafios, Minha Pontuacao, Ranking e Meu Perfil");
    expect(source).toContain(
      "Professor/Admin: Dashboard, Alunos, Turmas, Pilares, Desafios, Aprovacoes, Grupos, Ranking, Relatorios e Configuracoes"
    );
    expect(source).toContain("AuthGuard");
  });

  it("documenta observabilidade sem expor dados sensiveis", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("Observabilidade mínima");
    expect(source).toContain("src/services/logger.service.js");
    expect(source).toContain("endpoint, metodo, status, tipo e mensagem sanitizada");
    expect(source).toContain("sem stack trace");
  });
});
