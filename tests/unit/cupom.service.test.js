jest.mock("../../src/models/cupom.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  updateMany: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../../src/models/plano-estudo-item.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
}));

const Cupom = require("../../src/models/cupom.model");
const PlanoEstudoItem = require("../../src/models/plano-estudo-item.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const User = require("../../src/models/user.model");
const {
  distributeLuckyNumbers,
  getCouponOverview,
  listLuckyNumberCoupons,
  listStudentLuckyNumbers,
  syncCouponsForStudents,
  validatePendingCouponsForStudents,
} = require("../../src/services/cupom.service");

const STUDENT_ID = "6814f12ab3f34872f7558f41";
const OTHER_STUDENT_ID = "6814f12ab3f34872f7558f42";
const DESAFIO_ID = "6814f12ab3f34872f7558f43";
const ENVIO_ID = "6814f12ab3f34872f7558f44";

function mockQuery(modelMethod, value) {
  const query = {
    limit: jest.fn(() => query),
    lean: jest.fn().mockResolvedValue(value),
    populate: jest.fn(() => query),
    select: jest.fn(() => query),
    skip: jest.fn(() => query),
    sort: jest.fn(() => query),
  };
  modelMethod.mockReturnValueOnce(query);
  return query;
}

describe("cupom.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Cupom.create.mockResolvedValue({});
    Cupom.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 0 });
    Cupom.updateOne.mockResolvedValue({ acknowledged: true, modifiedCount: 0 });
  });

  it("gera cupons a cada 10 pontos considerando a pontuação do checklist", async () => {
    const occurredAt = new Date("2026-06-23T15:00:00.000Z");

    mockQuery(Pontuacao.find, [{ aluno: STUDENT_ID, pontos: 19 }]);
    mockQuery(PlanoEstudoItem.find, [
      {
        aluno: STUDENT_ID,
        plannedDateKey: "2026-06-23",
        scoreWindowStartKey: "2026-06-23",
        completedAt: new Date("2026-06-23T12:00:00.000Z"),
        deletedAt: null,
        status: "ativo",
      },
    ]);
    mockQuery(Cupom.find, []);
    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: STUDENT_ID,
        ordinal: 2,
        milestonePoints: 20,
        status: "pendente",
        conqueredAt: occurredAt,
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "pendente",
        conqueredAt: occurredAt,
      },
    ]);

    const summaryByStudent = await syncCouponsForStudents([STUDENT_ID], { occurredAt });
    const summary = summaryByStudent.get(STUDENT_ID);

    expect(Cupom.create).toHaveBeenCalledTimes(2);
    expect(Cupom.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "pendente",
        conqueredAt: occurredAt,
      })
    );
    expect(Cupom.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        aluno: STUDENT_ID,
        ordinal: 2,
        milestonePoints: 20,
        status: "pendente",
        conqueredAt: occurredAt,
      })
    );
    expect(summary).toMatchObject({
      totalCupons: 2,
      cuponsPendentes: 2,
      cuponsValidados: 0,
    });
  });

  it("valida todos os cupons pendentes do aluno após desafio com certificado postado", async () => {
    const validatedAt = new Date("2026-06-24T18:30:00.000Z");

    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: STUDENT_ID,
        ordinal: 2,
        milestonePoints: 20,
        status: "validado",
        conqueredAt: "2026-06-23T15:00:00.000Z",
        validatedAt,
        validatedByDesafio: { _id: DESAFIO_ID, title: "Certificado da semana" },
        validatedByEnvio: ENVIO_ID,
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-20T15:00:00.000Z",
        validatedAt,
        validatedByDesafio: { _id: DESAFIO_ID, title: "Certificado da semana" },
        validatedByEnvio: ENVIO_ID,
      },
    ]);

    const summaryByStudent = await validatePendingCouponsForStudents([STUDENT_ID], {
      desafioId: DESAFIO_ID,
      envioId: ENVIO_ID,
      validatedAt,
      populateValidationSource: true,
    });
    const summary = summaryByStudent.get(STUDENT_ID);

    expect(Cupom.updateMany).toHaveBeenCalledWith(
      { aluno: { $in: [STUDENT_ID] }, status: "pendente" },
      {
        $set: {
          status: "validado",
          validatedAt,
          validatedByDesafio: DESAFIO_ID,
          validatedByEnvio: ENVIO_ID,
          luckyNumber: null,
          luckyNumberAssignedAt: null,
          canceledAt: null,
        },
      }
    );
    expect(summary).toMatchObject({
      totalCupons: 2,
      cuponsValidados: 2,
      cuponsPendentes: 0,
    });
    expect(summary.itens[0]).toMatchObject({
      validado: true,
      validadoEm: validatedAt.toISOString(),
      desafioValidacao: {
        id: DESAFIO_ID,
        title: "Certificado da semana",
      },
    });
  });

  it("consolida a visão geral ignorando cupons cancelados", async () => {
    mockQuery(Cupom.find, [
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-01T10:00:00.000Z",
        validatedAt: "2026-06-10T10:00:00.000Z",
      },
      {
        _id: "cupom-2",
        aluno: OTHER_STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "pendente",
        conqueredAt: "2026-06-11T10:00:00.000Z",
      },
      {
        _id: "cupom-3",
        aluno: OTHER_STUDENT_ID,
        ordinal: 2,
        milestonePoints: 20,
        status: "cancelado",
        conqueredAt: "2026-06-12T10:00:00.000Z",
      },
    ]);

    const summary = await getCouponOverview({
      studentIds: [STUDENT_ID, OTHER_STUDENT_ID],
      sync: false,
    });

    expect(summary).toMatchObject({
      totalCupons: 2,
      cuponsValidados: 1,
      cuponsPendentes: 1,
      cuponsComNumeroSorte: 0,
      cuponsAguardandoNumeroSorte: 1,
      ultimoNumeroSorteDistribuidoEm: null,
    });
  });

  it("preserva números já distribuídos e numera apenas cupons validados pendentes", async () => {
    const previousDistributionAt = new Date("2026-06-24T18:30:00.000Z");
    User.findById.mockResolvedValue({ _id: "6814f12ab3f34872f7558f99", role: "admin" });
    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: OTHER_STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-20T10:00:00.000Z",
        validatedAt: "2026-06-25T10:00:00.000Z",
        luckyNumber: 7,
        luckyNumberAssignedAt: previousDistributionAt,
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-19T10:00:00.000Z",
        validatedAt: "2026-06-24T10:00:00.000Z",
      },
    ]);
    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: OTHER_STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-20T10:00:00.000Z",
        validatedAt: "2026-06-25T10:00:00.000Z",
        luckyNumber: 7,
        luckyNumberAssignedAt: previousDistributionAt,
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-19T10:00:00.000Z",
        validatedAt: "2026-06-24T10:00:00.000Z",
        luckyNumber: 8,
        luckyNumberAssignedAt: "2026-06-27T10:00:00.000Z",
      },
    ]);
    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: OTHER_STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-20T10:00:00.000Z",
        validatedAt: "2026-06-25T10:00:00.000Z",
        luckyNumber: 7,
        luckyNumberAssignedAt: previousDistributionAt,
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-19T10:00:00.000Z",
        validatedAt: "2026-06-24T10:00:00.000Z",
        luckyNumber: 8,
        luckyNumberAssignedAt: "2026-06-27T10:00:00.000Z",
      },
    ]);

    const result = await distributeLuckyNumbers("6814f12ab3f34872f7558f99");

    expect(Cupom.updateMany).not.toHaveBeenCalled();
    expect(Cupom.updateOne).toHaveBeenCalledTimes(1);
    expect(Cupom.updateOne).toHaveBeenCalledWith(
      { _id: "cupom-1" },
      {
        $set: {
          luckyNumber: 8,
          luckyNumberAssignedAt: expect.any(Date),
        },
      }
    );
    expect(result.resumo).toMatchObject({
      totalCuponsValidados: 2,
      numerosDistribuidos: 1,
      numerosJaDistribuidos: 1,
      totalNumerosDistribuidos: 2,
      alunosContemplados: 2,
      ultimaDistribuicaoEm: expect.any(String),
    });
    expect(result.cupons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "cupom-1", numeroSorte: 8, distribuido: true }),
        expect.objectContaining({ id: "cupom-2", numeroSorte: 7, distribuido: true }),
      ])
    );
  });

  it("lista por aluno os números da sorte já distribuídos", async () => {
    User.findById.mockResolvedValue({ _id: "6814f12ab3f34872f7558f99", role: "professor" });
    User.countDocuments.mockResolvedValue(2);
    mockQuery(User.find, [
      { _id: STUDENT_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "ativo" },
      { _id: OTHER_STUDENT_ID, name: "Bruno", email: "bruno@email.com", role: "aluno", status: "ativo" },
    ]);
    mockQuery(Pontuacao.find, [
      { aluno: STUDENT_ID, pontos: 20 },
      { aluno: OTHER_STUDENT_ID, pontos: 10 },
    ]);
    mockQuery(PlanoEstudoItem.find, []);
    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: STUDENT_ID,
        ordinal: 2,
        milestonePoints: 20,
        status: "validado",
        conqueredAt: "2026-06-20T10:00:00.000Z",
        validatedAt: "2026-06-24T10:00:00.000Z",
        luckyNumber: 12,
        luckyNumberAssignedAt: "2026-06-26T10:00:00.000Z",
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-18T10:00:00.000Z",
        validatedAt: "2026-06-22T10:00:00.000Z",
        luckyNumber: 4,
        luckyNumberAssignedAt: "2026-06-26T10:00:00.000Z",
      },
      {
        _id: "cupom-3",
        aluno: OTHER_STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-21T10:00:00.000Z",
        validatedAt: "2026-06-23T10:00:00.000Z",
      },
    ]);
    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: STUDENT_ID,
        ordinal: 2,
        milestonePoints: 20,
        status: "validado",
        conqueredAt: "2026-06-20T10:00:00.000Z",
        validatedAt: "2026-06-24T10:00:00.000Z",
        luckyNumber: 12,
        luckyNumberAssignedAt: "2026-06-26T10:00:00.000Z",
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-18T10:00:00.000Z",
        validatedAt: "2026-06-22T10:00:00.000Z",
        luckyNumber: 4,
        luckyNumberAssignedAt: "2026-06-26T10:00:00.000Z",
      },
      {
        _id: "cupom-3",
        aluno: OTHER_STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-21T10:00:00.000Z",
        validatedAt: "2026-06-23T10:00:00.000Z",
      },
    ]);
    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: STUDENT_ID,
        ordinal: 2,
        milestonePoints: 20,
        status: "validado",
        conqueredAt: "2026-06-20T10:00:00.000Z",
        validatedAt: "2026-06-24T10:00:00.000Z",
        luckyNumber: 12,
        luckyNumberAssignedAt: "2026-06-26T10:00:00.000Z",
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-18T10:00:00.000Z",
        validatedAt: "2026-06-22T10:00:00.000Z",
        luckyNumber: 4,
        luckyNumberAssignedAt: "2026-06-26T10:00:00.000Z",
      },
      {
        _id: "cupom-3",
        aluno: OTHER_STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-21T10:00:00.000Z",
        validatedAt: "2026-06-23T10:00:00.000Z",
      },
    ]);

    const result = await listStudentLuckyNumbers("6814f12ab3f34872f7558f99", { page: "1", limit: "10" });

    expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 2, totalPages: 1 });
    expect(result.alunos).toEqual([
      expect.objectContaining({
        aluno: expect.objectContaining({ id: STUDENT_ID, name: "Ana" }),
        totalCuponsValidados: 2,
        totalNumerosSorte: 2,
        cuponsAguardandoNumeroSorte: 0,
        numerosDaSorte: [4, 12],
      }),
      expect.objectContaining({
        aluno: expect.objectContaining({ id: OTHER_STUDENT_ID, name: "Bruno" }),
        totalCuponsValidados: 1,
        totalNumerosSorte: 0,
        cuponsAguardandoNumeroSorte: 1,
        numerosDaSorte: [],
      }),
    ]);
  });

  it("lista globalmente os cupons validados com status de distribuição", async () => {
    User.findById.mockResolvedValue({ _id: "6814f12ab3f34872f7558f99", role: "professor" });
    mockQuery(User.find, [
      { _id: STUDENT_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "ativo" },
      { _id: OTHER_STUDENT_ID, name: "Bruno", email: "bruno@email.com", role: "aluno", status: "ativo" },
    ]);
    mockQuery(Cupom.find, [
      {
        _id: "cupom-2",
        aluno: OTHER_STUDENT_ID,
        ordinal: 1,
        milestonePoints: 10,
        status: "validado",
        conqueredAt: "2026-06-21T10:00:00.000Z",
        validatedAt: "2026-06-23T10:00:00.000Z",
      },
      {
        _id: "cupom-1",
        aluno: STUDENT_ID,
        ordinal: 2,
        milestonePoints: 20,
        status: "validado",
        conqueredAt: "2026-06-20T10:00:00.000Z",
        validatedAt: "2026-06-24T10:00:00.000Z",
        luckyNumber: 12,
        luckyNumberAssignedAt: "2026-06-26T10:00:00.000Z",
      },
    ]);

    const result = await listLuckyNumberCoupons("6814f12ab3f34872f7558f99", { page: "1", limit: "10" });

    expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 2, totalPages: 1 });
    expect(result.resumo).toMatchObject({
      totalCuponsValidados: 2,
      cuponsDistribuidos: 1,
      cuponsAguardandoDistribuicao: 1,
    });
    expect(result.cupons).toEqual([
      expect.objectContaining({
        id: "cupom-2",
        numeroSorte: null,
        distribuido: false,
        aguardandoDistribuicao: true,
        aluno: expect.objectContaining({ id: OTHER_STUDENT_ID, name: "Bruno" }),
      }),
      expect.objectContaining({
        id: "cupom-1",
        numeroSorte: 12,
        distribuido: true,
        aguardandoDistribuicao: false,
        aluno: expect.objectContaining({ id: STUDENT_ID, name: "Ana" }),
      }),
    ]);
  });
});
