jest.mock("../../src/models/pontuacao.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const Pontuacao = require("../../src/models/pontuacao.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { getFilteredRanking } = require("../../src/services/ranking.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const STUDENT_ID = "6814f12ab3f34872f7558f41";
const ALUNO_A_ID = "6814f12ab3f34872f7558f42";
const ALUNO_B_ID = "6814f12ab3f34872f7558f43";
const TURMA_1_ID = "6814f12ab3f34872f7558f44";
const TURMA_2_ID = "6814f12ab3f34872f7558f45";
const PILAR_1_ID = "6814f12ab3f34872f7558f46";
const PILAR_2_ID = "6814f12ab3f34872f7558f47";

function mockPontuacaoFind(pontuacoes) {
  const query = {
    populate: jest.fn(() => query),
    sort: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(pontuacoes),
  };
  Pontuacao.find.mockReturnValue(query);
  return query;
}

function mockTurmaFind(turmas) {
  const query = {
    select: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(turmas),
  };
  Turma.find.mockReturnValue(query);
  return query;
}

function createPontuacao({
  id,
  alunoId,
  alunoName,
  desafioId,
  envioId,
  pontos,
  status = "aprovado",
  turmaId = TURMA_1_ID,
  pilarId = PILAR_1_ID,
  type = "individual",
  createdAt = "2026-01-15T10:00:00.000Z",
}) {
  return {
    _id: id,
    aluno: { _id: alunoId, name: alunoName, email: `${alunoName.toLowerCase()}@email.com`, role: "aluno", status: "ativo" },
    desafio: {
      _id: desafioId,
      title: "Desafio",
      points: pontos,
      type,
      pilar: { _id: pilarId, name: "Pilar" },
    },
    envio: {
      _id: envioId,
      status,
      type,
      turma: { _id: turmaId, name: "Turma" },
    },
    pontos,
    createdAt: new Date(createdAt),
  };
}

describe("ranking.service MR-94", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPontuacaoFind([]);
    mockTurmaFind([]);
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
  });

  it("retorna ranking geral ordenado pela soma de pontos aprovados", async () => {
    mockPontuacaoFind([
      createPontuacao({
        id: "6814f12ab3f34872f7558f48",
        alunoId: ALUNO_A_ID,
        alunoName: "Ana",
        desafioId: "6814f12ab3f34872f7558f49",
        envioId: "6814f12ab3f34872f7558f4a",
        pontos: 10,
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f4b",
        alunoId: ALUNO_B_ID,
        alunoName: "Bruno",
        desafioId: "6814f12ab3f34872f7558f4c",
        envioId: "6814f12ab3f34872f7558f4d",
        pontos: 30,
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f4e",
        alunoId: ALUNO_A_ID,
        alunoName: "Ana",
        desafioId: "6814f12ab3f34872f7558f4f",
        envioId: "6814f12ab3f34872f7558f50",
        pontos: 100,
        status: "pendente",
      }),
    ]);

    const result = await getFilteredRanking(ADMIN_ID);

    expect(result.totalParticipantes).toBe(2);
    expect(result.ranking.map((row) => [row.posicao, row.aluno.id, row.totalPontos])).toEqual([
      [1, ALUNO_B_ID, 30],
      [2, ALUNO_A_ID, 10],
    ]);
  });

  it("aplica filtros administrativos de turma, pilar, período e tipo sobre pontos aprovados", async () => {
    mockPontuacaoFind([
      createPontuacao({
        id: "6814f12ab3f34872f7558f51",
        alunoId: ALUNO_A_ID,
        alunoName: "Ana",
        desafioId: "6814f12ab3f34872f7558f52",
        envioId: "6814f12ab3f34872f7558f53",
        pontos: 20,
        type: "grupo",
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f54",
        alunoId: ALUNO_B_ID,
        alunoName: "Bruno",
        desafioId: "6814f12ab3f34872f7558f55",
        envioId: "6814f12ab3f34872f7558f56",
        pontos: 50,
        type: "grupo",
        pilarId: PILAR_2_ID,
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f57",
        alunoId: ALUNO_B_ID,
        alunoName: "Bruno",
        desafioId: "6814f12ab3f34872f7558f58",
        envioId: "6814f12ab3f34872f7558f59",
        pontos: 40,
        type: "grupo",
        turmaId: TURMA_2_ID,
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f5a",
        alunoId: ALUNO_A_ID,
        alunoName: "Ana",
        desafioId: "6814f12ab3f34872f7558f5b",
        envioId: "6814f12ab3f34872f7558f5c",
        pontos: 30,
        type: "individual",
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f5d",
        alunoId: ALUNO_A_ID,
        alunoName: "Ana",
        desafioId: "6814f12ab3f34872f7558f5e",
        envioId: "6814f12ab3f34872f7558f5f",
        pontos: 25,
        type: "grupo",
        createdAt: "2026-02-02T10:00:00.000Z",
      }),
    ]);

    const result = await getFilteredRanking(ADMIN_ID, {
      turmaId: TURMA_1_ID,
      pilarId: PILAR_1_ID,
      type: "grupo",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    expect(Pontuacao.find).toHaveBeenCalledWith({
      createdAt: {
        $gte: new Date("2026-01-01"),
        $lte: new Date("2026-01-31T23:59:59.999Z"),
      },
    });
    expect(result.filtros).toMatchObject({ turmaId: TURMA_1_ID, pilarId: PILAR_1_ID, type: "grupo" });
    expect(result.ranking).toHaveLength(1);
    expect(result.ranking[0]).toMatchObject({
      aluno: { id: ALUNO_A_ID },
      totalPontos: 20,
      desafiosAprovados: 1,
    });
  });

  it("permite ranking geral para aluno sem limitar pela turma quando não há filtro de turma", async () => {
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "aluno" });
    mockTurmaFind([{ _id: TURMA_1_ID }]);
    mockPontuacaoFind([
      createPontuacao({
        id: "6814f12ab3f34872f7558f60",
        alunoId: STUDENT_ID,
        alunoName: "Aluno",
        desafioId: "6814f12ab3f34872f7558f61",
        envioId: "6814f12ab3f34872f7558f62",
        pontos: 10,
        turmaId: TURMA_1_ID,
      }),
      createPontuacao({
        id: "6814f12ab3f34872f7558f63",
        alunoId: ALUNO_B_ID,
        alunoName: "Bruno",
        desafioId: "6814f12ab3f34872f7558f64",
        envioId: "6814f12ab3f34872f7558f65",
        pontos: 30,
        turmaId: TURMA_2_ID,
      }),
    ]);

    const result = await getFilteredRanking(STUDENT_ID);

    expect(result.escopo.turmaIds).toBeNull();
    expect(result.totalParticipantes).toBe(2);
    expect(result.ranking.map((row) => row.aluno.id)).toEqual([ALUNO_B_ID, STUDENT_ID]);
  });
});
