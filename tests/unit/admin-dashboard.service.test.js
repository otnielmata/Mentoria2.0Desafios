jest.mock("../../src/models/desafio.model", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../../src/models/envio-desafio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

const EnvioDesafio = require("../../src/models/envio-desafio.model");
const Desafio = require("../../src/models/desafio.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const User = require("../../src/models/user.model");
const { getAdminDashboard } = require("../../src/services/admin-dashboard.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const ALUNO_1_ID = "6814f12ab3f34872f7558f41";
const ALUNO_2_ID = "6814f12ab3f34872f7558f42";
const TURMA_ID = "6814f12ab3f34872f7558f43";
const PILAR_ID = "6814f12ab3f34872f7558f44";

function mockFindChain(model, value) {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(value),
  };
  model.find.mockReturnValueOnce(query);
  return query;
}

function createPontuacao({ alunoId, alunoName, pontos, status = "aprovado", envioId }) {
  return {
    _id: "6814f12ab3f34872f7558f45",
    aluno: { _id: alunoId, name: alunoName, email: `${alunoName.toLowerCase()}@email.com`, role: "aluno", status: "ativo", password: "secret" },
    envio: { _id: envioId, status, turma: { _id: TURMA_ID, name: "Turma 1" } },
    desafio: { _id: "6814f12ab3f34872f7558f46", title: "Desafio", points: pontos, pilar: { _id: PILAR_ID, name: "Prática" } },
    pontos,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
  };
}

describe("admin-dashboard.service MR-95", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    Desafio.countDocuments.mockResolvedValue(2);
  });

  it("retorna pendências, ranking, alunos ativos e métricas de participação sem segredos", async () => {
    mockFindChain(User, [
      { _id: ALUNO_1_ID, name: "Ana", role: "aluno", status: "ativo", password: "secret" },
      { _id: ALUNO_2_ID, name: "Bruno", role: "aluno", status: "ativo", password: "secret" },
      { _id: "6814f12ab3f34872f7558f47", name: "Inativo", role: "aluno", status: "inativo", password: "secret" },
      { _id: ADMIN_ID, name: "Admin", role: "admin", status: "ativo", password: "secret" },
    ]);
    mockFindChain(EnvioDesafio, [
      {
        _id: "6814f12ab3f34872f7558f48",
        aluno: ALUNO_1_ID,
        participantes: [],
        status: "pendente",
        turma: { _id: TURMA_ID, name: "Turma 1" },
      },
      {
        _id: "6814f12ab3f34872f7558f49",
        aluno: ALUNO_2_ID,
        participantes: [],
        status: "aprovado",
        turma: { _id: TURMA_ID, name: "Turma 1" },
      },
    ]);
    mockFindChain(Pontuacao, [
      createPontuacao({ alunoId: ALUNO_1_ID, alunoName: "Ana", pontos: 20, envioId: "6814f12ab3f34872f7558f4a" }),
      createPontuacao({ alunoId: ALUNO_2_ID, alunoName: "Bruno", pontos: 50, envioId: "6814f12ab3f34872f7558f4b" }),
      createPontuacao({ alunoId: ALUNO_1_ID, alunoName: "Ana", pontos: 100, status: "pendente", envioId: "6814f12ab3f34872f7558f4c" }),
    ]);

    const result = await getAdminDashboard(ADMIN_ID);

    expect(result.indicadores).toMatchObject({
      alunosAtivos: 2,
      totalEnvios: 2,
      quantidadeDesafios: 2,
      desafiosAtivos: 2,
      aprovacoesPendentes: 1,
    });
    expect(result.topRanking.map((row) => [row.aluno.id, row.totalPontos])).toEqual([
      [ALUNO_2_ID, 50],
      [ALUNO_1_ID, 20],
    ]);
    expect(result.metricasParticipacao).toEqual(result.engajamento);
    expect(result.desafiosPorPilar).toEqual([
      expect.objectContaining({
        quantidade: 2,
        percentual: 1,
        pilar: expect.objectContaining({ name: "Prática" }),
      }),
    ]);
    expect(result.engajamento).toMatchObject({
      alunosComEnvio: 2,
      taxaParticipacao: 1,
      mediaEnviosPorAluno: 1,
      taxaAprovacao: 1,
    });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("password");
  });

  it("bloqueia dashboard administrativo para perfil sem permissão", async () => {
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "aluno" });

    await expect(getAdminDashboard(ADMIN_ID)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode consultar o dashboard geral.",
    });
  });
});
