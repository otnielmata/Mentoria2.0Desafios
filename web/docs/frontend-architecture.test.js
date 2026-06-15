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
    expect(source).toContain("GET  /api/configuracoes");
    expect(source).toContain("GET  /api/dashboard/aluno");
    expect(source).toContain("GET  /api/dashboard/admin");
    expect(source).toContain("GET  /api/desafios");
    expect(source).toContain("POST /api/desafios");
    expect(source).toContain("GET  /api/grupos");
    expect(source).toContain("GET  /api/grupos/meus");
    expect(source).toContain("GET  /api/envios-desafios/aprovacoes");
    expect(source).toContain("PATCH /api/envios-desafios/aprovacoes");
    expect(source).toContain("POST /api/envios-desafios");
    expect(source).toContain("GET  /api/envios-desafios/meus");
    expect(source).toContain("GET  /api/pontuacoes/minha");
    expect(source).toContain("GET  /api/pilares");
    expect(source).toContain("GET  /api/ranking");
    expect(source).toContain("GET  /api/turmas");
    expect(source).toContain("POST /api/turmas");
    expect(source).toContain("GET  /api/users");
    expect(source).toContain("POST /api/users");
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

  it("documenta o fluxo de gestao de pilares", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/pilares/page.js");
    expect(source).toContain("getPillars");
    expect(source).toContain("toPillarsDto");
    expect(source).toContain("listPillarsRequest");
    expect(source).toContain("nao recria seed dos sete pilares");
  });

  it("documenta o fluxo de gestao de alunos", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/alunos/page.js");
    expect(source).toContain("getUsers/createUser");
    expect(source).toContain("toUsersDto/validateUserPayload");
    expect(source).toContain("listUsersRequest/createUserRequest");
    expect(source).toContain("sem exibir senha");
  });

  it("documenta o fluxo de gestao de turmas", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/turmas/page.js");
    expect(source).toContain("getClasses/createClass");
    expect(source).toContain("toClassesDto/validateClassPayload");
    expect(source).toContain("listClassesRequest/createClassRequest");
    expect(source).toContain("nao contem logica de pontuacao");
  });

  it("documenta o fluxo de gestao de desafios", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/desafios/page.js");
    expect(source).toContain("getChallenges/createChallenge");
    expect(source).toContain("toChallengesDto/validateChallengePayload");
    expect(source).toContain("listChallengesRequest/createChallengeRequest");
    expect(source).toContain("pontos fixos por desafio");
  });

  it("documenta o fluxo de configuracoes iniciais", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/configuracoes/page.js");
    expect(source).toContain("getConfigurations");
    expect(source).toContain("toConfigurationsDto");
    expect(source).toContain("getConfigurationsRequest");
    expect(source).toContain("GET /api/configuracoes");
    expect(source).toContain("modo somente leitura");
  });

  it("documenta o fluxo de aprovacoes de envios", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/aprovacoes/page.js");
    expect(source).toContain("getChallengeApprovals/reviewChallengeApproval");
    expect(source).toContain("toChallengeApprovalsDto/validateApprovalReviewPayload");
    expect(source).toContain("listChallengeApprovalsRequest/reviewChallengeApprovalRequest");
    expect(source).toContain("GET/PATCH /api/envios-desafios/aprovacoes");
    expect(source).toContain("sem download automatico");
  });

  it("documenta o fluxo de consulta de grupos", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/grupos/page.js");
    expect(source).toContain("getGroups");
    expect(source).toContain("toGroupsDto");
    expect(source).toContain("listGroupsRequest");
    expect(source).toContain("GET /api/grupos");
    expect(source).toContain("nao exibe dados sensiveis dos alunos");
  });

  it("documenta o fluxo de meus grupos", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/meus-grupos/page.js");
    expect(source).toContain("getMyGroups");
    expect(source).toContain("toGroupsDto");
    expect(source).toContain("listMyGroupsRequest");
    expect(source).toContain("GET /api/grupos/meus");
    expect(source).toContain("nao recalcula ranking no navegador");
  });

  it("documenta o fluxo de registro de desafio", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/registrar-desafio/page.js");
    expect(source).toContain("submitChallengeSubmission");
    expect(source).toContain("validateChallengeSubmissionPayload");
    expect(source).toContain("submitChallengeSubmissionRequest");
    expect(source).toContain("GET /api/pilares");
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
    expect(source).toContain(
      "Aluno: Inicio, Registrar Desafio, Meus Desafios, Minha Pontuacao, Meus Grupos, Ranking e Meu Perfil"
    );
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
