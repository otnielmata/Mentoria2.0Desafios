jest.mock("../../src/models/envio-desafio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/grupo-desafio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/plano-estudo-item.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

const EnvioDesafio = require("../../src/models/envio-desafio.model");
const GrupoDesafio = require("../../src/models/grupo-desafio.model");
const PlanoEstudoItem = require("../../src/models/plano-estudo-item.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const User = require("../../src/models/user.model");
const { getChallengeGroupsReport, getParticipationReport, getStudentPillarReport } = require("../../src/services/admin-relatorio-participacao.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const ALUNO_1_ID = "6814f12ab3f34872f7558f41";
const ALUNO_2_ID = "6814f12ab3f34872f7558f42";
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

describe("admin-relatorio-participacao.service MR-95", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "professor" });
  });

  it("retorna participação por aluno, turma, período e baixa participação sem dados sensíveis", async () => {
    mockFindChain(User, [
      { _id: ALUNO_1_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "ativo", password: "secret" },
      { _id: ALUNO_2_ID, name: "Bruno", email: "bruno@email.com", role: "aluno", status: "ativo", password: "secret" },
    ]);
    mockFindChain(EnvioDesafio, [
      {
        _id: "6814f12ab3f34872f7558f45",
        aluno: ALUNO_1_ID,
        participantes: [],
        status: "aprovado",
        turma: { _id: TURMA_ID, name: "Turma 1" },
        desafio: { _id: "6814f12ab3f34872f7558f46", pilar: { _id: PILAR_ID, name: "Prática" } },
        createdAt: new Date("2026-01-10T10:00:00.000Z"),
      },
    ]);
    mockFindChain(Pontuacao, [
      {
        _id: "6814f12ab3f34872f7558f47",
        aluno: { _id: ALUNO_1_ID, name: "Ana", password: "secret" },
        pontos: 40,
        envio: {
          _id: "6814f12ab3f34872f7558f45",
          status: "aprovado",
          turma: { _id: TURMA_ID, name: "Turma 1" },
          createdAt: new Date("2026-01-10T10:00:00.000Z"),
        },
        desafio: { _id: "6814f12ab3f34872f7558f46", pilar: { _id: PILAR_ID, name: "Prática" } },
        createdAt: new Date("2026-01-10T10:00:00.000Z"),
      },
      {
        _id: "6814f12ab3f34872f7558f48",
        aluno: { _id: ALUNO_1_ID, name: "Ana", password: "secret" },
        pontos: 100,
        envio: {
          _id: "6814f12ab3f34872f7558f49",
          status: "pendente",
          turma: { _id: TURMA_ID, name: "Turma 1" },
          createdAt: new Date("2026-01-10T10:00:00.000Z"),
        },
        desafio: { _id: "6814f12ab3f34872f7558f4a", pilar: { _id: PILAR_ID, name: "Prática" } },
        createdAt: new Date("2026-01-10T10:00:00.000Z"),
      },
    ]);

    const result = await getParticipationReport(ADMIN_ID, {
      dataInicio: "2026-01-01",
      dataFim: "2026-01-31",
      diasSemEnvio: "30",
      pontuacaoMinima: "30",
    });

    expect(User.find).toHaveBeenCalledWith({ role: "aluno", status: "ativo" });
    expect(result.periodo).toEqual({
      startDate: new Date("2026-01-01").toISOString(),
      endDate: new Date("2026-01-31T23:59:59.999Z").toISOString(),
    });
    expect(result.quantidadeEnvios).toBe(1);
    expect(result.distribuicaoPontos.totalPontos).toBe(40);
    expect(result.participacaoPorAluno).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ aluno: expect.objectContaining({ id: ALUNO_1_ID }), totalEnvios: 1, totalPontos: 40 }),
        expect.objectContaining({ aluno: expect.objectContaining({ id: ALUNO_2_ID }), totalEnvios: 0, totalPontos: 0 }),
      ])
    );
    expect(result.participacaoPorTurma).toEqual([
      expect.objectContaining({
        turma: expect.objectContaining({ id: TURMA_ID }),
        totalEnvios: 1,
        totalPontos: 40,
        participantes: 1,
        desafiosAprovados: 1,
      }),
    ]);
    expect(result.baixaParticipacao).toMatchObject({
      aplicado: true,
      totalAlunosAvaliados: 2,
      totalBaixaParticipacao: 1,
      resumo: { porDiasSemEnvio: 1, porPontuacaoMinima: 1 },
    });
    expect(result.baixaParticipacao.alunos[0]).toMatchObject({
      aluno: { id: ALUNO_2_ID },
      motivos: expect.arrayContaining([
        expect.objectContaining({ tipo: "sem_envio" }),
        expect.objectContaining({ tipo: "pontuacao_minima" }),
      ]),
    });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("password");
  });

  it("bloqueia relatório para perfil sem permissão", async () => {
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "aluno" });

    await expect(getParticipationReport(ADMIN_ID)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode consultar relatório de participação.",
    });
  });

  it("retorna relatório paginado de pontos por aluno e pilar incluindo pontos extras", async () => {
    mockFindChain(User, [
      { _id: ALUNO_1_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "ativo" },
      { _id: ALUNO_2_ID, name: "Bruno", email: "bruno@email.com", role: "aluno", status: "ativo" },
    ]);
    mockFindChain(Pontuacao, [
      {
        _id: "6814f12ab3f34872f7558f4b",
        aluno: { _id: ALUNO_1_ID, name: "Ana", email: "ana@email.com", turmas: [] },
        pontos: 15,
        source: "pontuacao_extra",
        createdBy: { _id: ADMIN_ID, name: "Professor Extra", email: "extra@email.com", role: "professor" },
        pilares: [{ pilar: { _id: PILAR_ID, name: "Prática" }, pontos: 15 }],
        createdAt: new Date("2026-01-20T10:00:00.000Z"),
      },
      {
        _id: "6814f12ab3f34872f7558f4c",
        aluno: { _id: ALUNO_1_ID, name: "Ana", email: "ana@email.com", turmas: [] },
        pontos: 25,
        envio: {
          _id: "6814f12ab3f34872f7558f45",
          status: "aprovado",
          turma: { _id: TURMA_ID, name: "Turma 1" },
          createdAt: new Date("2026-01-21T10:00:00.000Z"),
          approvedAt: new Date("2026-01-22T10:00:00.000Z"),
          approvedBy: { _id: ADMIN_ID, name: "Professor Aprovador", email: "aprovador@email.com", role: "professor" },
        },
        desafio: { _id: "6814f12ab3f34872f7558f46", pilar: { _id: PILAR_ID, name: "Prática" } },
        createdAt: new Date("2026-01-21T10:00:00.000Z"),
      },
    ]);
    mockFindChain(PlanoEstudoItem, [
      {
        _id: "6814f12ab3f34872f7558f4d",
        aluno: ALUNO_1_ID,
        startAt: new Date("2026-01-20T19:00:00.000Z"),
        plannedDateKey: "2026-01-20",
        scoreWindowStartKey: "2026-01-20",
        completedAt: new Date("2026-01-20T20:30:00.000Z"),
        status: "ativo",
      },
      {
        _id: "6814f12ab3f34872f7558f4e",
        aluno: ALUNO_1_ID,
        startAt: new Date("2026-01-21T19:00:00.000Z"),
        plannedDateKey: "2026-01-21",
        scoreWindowStartKey: "2026-01-20",
        completedAt: new Date("2026-01-21T20:30:00.000Z"),
        status: "ativo",
      },
    ]);

    const result = await getStudentPillarReport(ADMIN_ID, { search: "Ana", page: "1", limit: "10" });

    expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(result.alunos).toEqual([
      expect.objectContaining({
        aluno: expect.objectContaining({ id: ALUNO_1_ID, name: "Ana", email: "ana@email.com" }),
        totalPontos: 41,
        checklistPlanejamento: expect.objectContaining({
          totalPontos: 1,
          totalTarefas: 2,
          tarefasConcluidas: 2,
          diasComCheck: 2,
          semanas: [
            expect.objectContaining({
              inicio: "2026-01-20",
              fim: "2026-01-26",
              diasComCheck: 2,
              pontos: 1,
            }),
          ],
        }),
        pontosPorPilar: [
          expect.objectContaining({
            pilar: expect.objectContaining({ id: PILAR_ID, name: "Prática" }),
            pontos: 40,
            lancamentos: expect.arrayContaining([
              expect.objectContaining({
                dataLancamento: "2026-01-20T10:00:00.000Z",
                responsavel: expect.objectContaining({ name: "Professor Extra" }),
                tipo: "ponto_extra",
                pontos: 15,
              }),
              expect.objectContaining({
                dataLancamento: "2026-01-22T10:00:00.000Z",
                responsavel: expect.objectContaining({ name: "Professor Aprovador" }),
                tipo: "desafio",
                pontos: 25,
              }),
            ]),
          }),
        ],
        detalhesPontosPorPilar: expect.arrayContaining([
          expect.objectContaining({
            pilar: expect.objectContaining({ name: "Prática" }),
            responsavel: expect.objectContaining({ name: "Professor Extra" }),
            tipo: "ponto_extra",
            pontos: 15,
          }),
          expect.objectContaining({
            pilar: expect.objectContaining({ name: "Prática" }),
            responsavel: expect.objectContaining({ name: "Professor Aprovador" }),
            tipo: "desafio",
            pontos: 25,
          }),
        ]),
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("password");
  });

  it("retorna relatório paginado dos grupos formados por desafio e status do envio", async () => {
    const GRUPO_ID = "6814f12ab3f34872f7558f4d";
    const DESAFIO_ID = "6814f12ab3f34872f7558f4e";
    mockFindChain(GrupoDesafio, [
      {
        _id: GRUPO_ID,
        desafio: { _id: DESAFIO_ID, title: "Publicar artigo", pilar: { _id: PILAR_ID, name: "Compartilhamento" } },
        turma: { _id: TURMA_ID, name: "Turma 1" },
        participantes: [
          { _id: ALUNO_1_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "ativo", password: "secret" },
          { _id: ALUNO_2_ID, name: "Bruno", email: "bruno@email.com", role: "aluno", status: "ativo", password: "secret" },
        ],
        maxParticipantes: 2,
        modalidade: "ingles",
        status: "completo",
        createdAt: new Date("2026-02-01T10:00:00.000Z"),
      },
    ]);
    mockFindChain(EnvioDesafio, [
      {
        _id: "6814f12ab3f34872f7558f4f",
        grupo: GRUPO_ID,
        aluno: { _id: ALUNO_1_ID, name: "Ana", email: "ana@email.com" },
        participantes: [
          { _id: ALUNO_1_ID, name: "Ana", email: "ana@email.com" },
          { _id: ALUNO_2_ID, name: "Bruno", email: "bruno@email.com" },
        ],
        status: "pendente",
        createdAt: new Date("2026-02-02T10:00:00.000Z"),
      },
    ]);

    const result = await getChallengeGroupsReport(ADMIN_ID, { search: "artigo", page: "1", limit: "10" });

    expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(result.resumo).toMatchObject({
      totalGrupos: 1,
      gruposFormados: 1,
      enviosRealizados: 1,
      pendentes: 1,
      aprovados: 0,
    });
    expect(result.grupos).toEqual([
      expect.objectContaining({
        tituloDesafio: "Publicar artigo",
        turma: expect.objectContaining({ id: TURMA_ID, name: "Turma 1" }),
        modalidade: "ingles",
        grupoFormado: true,
        enviadoParaAprovacao: true,
        statusEnvio: "pendente",
        pendente: true,
        aprovado: false,
        participantes: [
          expect.objectContaining({ id: ALUNO_1_ID, name: "Ana", email: "ana@email.com" }),
          expect.objectContaining({ id: ALUNO_2_ID, name: "Bruno", email: "bruno@email.com" }),
        ],
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(JSON.stringify(result)).not.toContain("password");
  });
});
