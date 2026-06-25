jest.mock("../../src/models/pontuacao.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/services/plano-estudo.service", () => {
  const actual = jest.requireActual("../../src/services/plano-estudo.service");
  return {
    ...actual,
    getChecklistSummaryFromFilters: jest.fn(),
  };
});

const Pontuacao = require("../../src/models/pontuacao.model");
const User = require("../../src/models/user.model");
const planoEstudoService = require("../../src/services/plano-estudo.service");
const { getMyPontuacoes } = require("../../src/services/me-pontuacao.service");

const STUDENT_ID = "6814f12ab3f34872f7558f41";
const TURMA_ID = "6814f12ab3f34872f7558f42";
const PILAR_1_ID = "6814f12ab3f34872f7558f43";
const PILAR_2_ID = "6814f12ab3f34872f7558f44";

function mockPontuacaoFind(pontuacoes) {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(pontuacoes),
  };
  Pontuacao.find.mockReturnValue(query);
  return query;
}

function createPontuacao({
  id,
  envioId,
  desafioId,
  pontos,
  status = "aprovado",
  pilarId = PILAR_1_ID,
  pilarName = "Conhecimento Técnico Alinhado ao Mercado",
  createdAt = "2026-01-15T10:00:00.000Z",
}) {
  return {
    _id: id,
    envio: {
      _id: envioId,
      status,
      turma: { _id: TURMA_ID, name: "Turma 1" },
      approvedAt: new Date(createdAt),
    },
    desafio: {
      _id: desafioId,
      title: "Desafio",
      description: "Descrição",
      points: pontos,
      pilar: { _id: pilarId, name: pilarName },
    },
    pontos,
    createdAt: new Date(createdAt),
  };
}

describe("me-pontuacao.service MR-94", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "aluno", status: "ativo" });
    mockPontuacaoFind([]);
    planoEstudoService.getChecklistSummaryFromFilters.mockResolvedValue({ totalPontos: 0, totalTarefas: 0, tarefasConcluidas: 0, diasComCheck: 0, semanas: [] });
  });

  it("retorna total, pontos por pilar e histórico usando apenas envios aprovados", async () => {
    planoEstudoService.getChecklistSummaryFromFilters.mockResolvedValue({
      totalPontos: 2,
      totalTarefas: 2,
      tarefasConcluidas: 2,
      diasComCheck: 4,
      semanas: [],
    });
    mockPontuacaoFind([
      createPontuacao({
        id: "6814f12ab3f34872f7558f45",
        envioId: "6814f12ab3f34872f7558f46",
        desafioId: "6814f12ab3f34872f7558f47",
        pontos: 10,
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f48",
        envioId: "6814f12ab3f34872f7558f49",
        desafioId: "6814f12ab3f34872f7558f4a",
        pontos: 20,
        pilarId: PILAR_2_ID,
        pilarName: "Visibilidade",
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f4b",
        envioId: "6814f12ab3f34872f7558f4c",
        desafioId: "6814f12ab3f34872f7558f4d",
        pontos: 100,
        status: "reprovado",
      }),
    ]);

    const result = await getMyPontuacoes(STUDENT_ID);

    expect(Pontuacao.find).toHaveBeenCalledWith({ aluno: STUDENT_ID });
    expect(result.totalPontos).toBe(32);
    expect(result.desafiosAprovados).toBe(2);
    expect(result.historico).toHaveLength(2);
    expect(result.checklistPlanejamento).toMatchObject({ totalPontos: 2 });
    expect(result.pontosPorPilar).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pilar: expect.objectContaining({ id: PILAR_1_ID }), pontos: 10, desafiosAprovados: 1 }),
        expect.objectContaining({ pilar: expect.objectContaining({ id: PILAR_2_ID }), pontos: 20, desafiosAprovados: 1 }),
      ])
    );
  });

  it("bloqueia consulta de pontuação para perfil diferente de aluno", async () => {
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "admin" });

    await expect(getMyPontuacoes(STUDENT_ID)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas aluno autenticado pode consultar pontuações.",
    });
  });
});
