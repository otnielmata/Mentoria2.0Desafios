jest.mock("../../src/models/desafio.model", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../../src/models/envio-desafio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const EnvioDesafio = require("../../src/models/envio-desafio.model");
const Desafio = require("../../src/models/desafio.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { getMyDashboard } = require("../../src/services/me-dashboard.service");

const STUDENT_ID = "6814f12ab3f34872f7558f41";
const OTHER_STUDENT_ID = "6814f12ab3f34872f7558f42";
const TURMA_ID = "6814f12ab3f34872f7558f43";
const PILAR_ID = "6814f12ab3f34872f7558f44";

function mockFindChain(model, value) {
  const query = {
    populate: jest.fn(() => query),
    select: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(value),
  };
  model.find.mockReturnValueOnce(query);
  return query;
}

function createPontuacao({ alunoId = STUDENT_ID, pontos = 20, status = "aprovado", envioId = "6814f12ab3f34872f7558f45" }) {
  return {
    _id: "6814f12ab3f34872f7558f46",
    aluno: { _id: alunoId, name: "Aluno", status: "ativo" },
    envio: {
      _id: envioId,
      status,
      turma: { _id: TURMA_ID, name: "Turma 1" },
    },
    desafio: {
      _id: "6814f12ab3f34872f7558f47",
      title: "Desafio",
      points: pontos,
      pilar: { _id: PILAR_ID, name: "Prática" },
    },
    pontos,
    createdAt: new Date("2026-01-15T10:00:00.000Z"),
  };
}

describe("me-dashboard.service MR-95", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "aluno", status: "ativo" });
    Desafio.countDocuments.mockResolvedValue(2);
    mockFindChain(Turma, [{ _id: TURMA_ID }]);
  });

  it("retorna métricas consolidadas do aluno sem exigir cálculo na Web", async () => {
    mockFindChain(Pontuacao, [
      createPontuacao({ pontos: 30 }),
      createPontuacao({ pontos: 100, status: "pendente", envioId: "6814f12ab3f34872f7558f48" }),
    ]);
    mockFindChain(Pontuacao, [
      createPontuacao({ pontos: 30 }),
      createPontuacao({ alunoId: OTHER_STUDENT_ID, pontos: 50, envioId: "6814f12ab3f34872f7558f49" }),
    ]);
    mockFindChain(EnvioDesafio, [
      {
        _id: "6814f12ab3f34872f7558f4a",
        aluno: STUDENT_ID,
        turma: { _id: TURMA_ID, name: "Turma 1" },
        desafio: { _id: "6814f12ab3f34872f7558f4b", title: "Desafio 1", pilar: { _id: PILAR_ID, name: "Prática" } },
        status: "pendente",
        type: "individual",
        createdAt: new Date("2026-01-20T10:00:00.000Z"),
      },
      {
        _id: "6814f12ab3f34872f7558f4c",
        aluno: STUDENT_ID,
        turma: { _id: TURMA_ID, name: "Turma 1" },
        desafio: { _id: "6814f12ab3f34872f7558f4d", title: "Desafio 2", pilar: { _id: PILAR_ID, name: "Prática" } },
        status: "aprovado",
        type: "individual",
        createdAt: new Date("2026-01-18T10:00:00.000Z"),
      },
      {
        _id: "6814f12ab3f34872f7558f4e",
        aluno: STUDENT_ID,
        turma: { _id: TURMA_ID, name: "Turma 1" },
        desafio: { _id: "6814f12ab3f34872f7558f4f", title: "Desafio 3", pilar: { _id: PILAR_ID, name: "Prática" } },
        status: "ajuste",
        type: "individual",
        createdAt: new Date("2026-01-16T10:00:00.000Z"),
      },
    ]);

    const result = await getMyDashboard(STUDENT_ID);

    expect(result.totalPontos).toBe(30);
    expect(result.ranking).toMatchObject({ posicao: 2, totalParticipantes: 2 });
    expect(result.desafiosEnviados).toMatchObject({
      total: 3,
      totaisPorStatus: expect.objectContaining({ aprovado: 1, pendente: 1, ajuste: 1 }),
    });
    expect(result.desafiosAtivos).toBe(2);
    expect(result.quantidadeDesafios).toBe(2);
    expect(result.pendencias).toBe(1);
    expect(result.evolucaoPorCategoria).toEqual(result.pontosPorPilar);
    expect(result.ultimosEnvios).toHaveLength(3);
  });

  it("bloqueia dashboard do aluno para outros perfis", async () => {
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "admin" });

    await expect(getMyDashboard(STUDENT_ID)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas aluno autenticado pode consultar o dashboard.",
    });
  });
});
