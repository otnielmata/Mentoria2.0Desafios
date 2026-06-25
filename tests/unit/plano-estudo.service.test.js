jest.mock("../../src/models/plano-estudo-item.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/services/evento-ao-vivo.service", () => ({
  listEventosForAgenda: jest.fn(),
}));

jest.mock("../../src/services/cupom.service", () => ({
  syncCouponsForStudents: jest.fn(),
}));

const PlanoEstudoItem = require("../../src/models/plano-estudo-item.model");
const User = require("../../src/models/user.model");
const { syncCouponsForStudents } = require("../../src/services/cupom.service");
const eventoAoVivoService = require("../../src/services/evento-ao-vivo.service");
const {
  buildChecklistSummary,
  createItem,
  deleteItem,
  getAgenda,
  updateItem,
} = require("../../src/services/plano-estudo.service");

const STUDENT_ID = "6814f12ab3f34872f7558f42";
const ITEM_ID = "6814f12ab3f34872f7558f44";
const ADMIN_ID = "6814f12ab3f34872f7558f40";

function mockFindChain(items) {
  return {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items),
  };
}

describe("plano-estudo.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: STUDENT_ID, role: "aluno" }),
    });
    PlanoEstudoItem.create.mockResolvedValue({
      _id: ITEM_ID,
      toObject: () => ({
        _id: ITEM_ID,
        aluno: STUDENT_ID,
        title: "Revisar testes",
        notes: "Capítulo 3",
        startAt: new Date("2026-06-24T10:00:00.000Z"),
        endAt: new Date("2026-06-24T11:00:00.000Z"),
        color: "#8502ab",
        status: "ativo",
      }),
    });
    PlanoEstudoItem.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: ITEM_ID,
        aluno: STUDENT_ID,
        title: "Revisar testes",
        notes: "Capítulo 3",
        startAt: new Date("2026-06-24T10:00:00.000Z"),
        endAt: new Date("2026-06-24T11:00:00.000Z"),
        color: "#8502ab",
        status: "ativo",
      }),
    });
    eventoAoVivoService.listEventosForAgenda.mockResolvedValue([
      {
        id: "6814f12ab3f34872f7558f43",
        title: "Mentoria Módulo 4",
        startAt: "2026-06-20T12:00:00.000Z",
        endAt: "2026-06-20T14:00:00.000Z",
        source: "mentoria",
        editable: false,
        readOnly: true,
      },
    ]);
    PlanoEstudoItem.countDocuments.mockResolvedValue(1);
    PlanoEstudoItem.find.mockReturnValue(
      mockFindChain([
        {
          _id: ITEM_ID,
          aluno: STUDENT_ID,
          title: "Revisar testes",
          notes: "Capítulo 3",
          startAt: new Date("2026-06-24T10:00:00.000Z"),
          endAt: new Date("2026-06-24T11:00:00.000Z"),
          color: "#8502ab",
          status: "ativo",
        },
      ])
    );
    syncCouponsForStudents.mockResolvedValue(new Map());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("cadastra item pessoal do plano de estudo", async () => {
    const result = await createItem(STUDENT_ID, {
      title: "Revisar testes",
      notes: "Capítulo 3",
      startAt: "2026-06-24T10:00:00.000Z",
      endAt: "2026-06-24T11:00:00.000Z",
    });

    expect(PlanoEstudoItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        aluno: STUDENT_ID,
        title: "Revisar testes",
      })
    );
    expect(result).toMatchObject({
      title: "Revisar testes",
      source: "pessoal",
      editable: true,
      readOnly: false,
      plannedDateKey: "2026-06-24",
      completed: false,
    });
  });

  it("bloqueia admin de cadastrar item pessoal", async () => {
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: ADMIN_ID, role: "admin" }),
    });

    await expect(
      createItem(ADMIN_ID, {
        title: "Planejamento inválido",
        startAt: "2026-06-24T10:00:00.000Z",
      })
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("mescla eventos da mentoria com itens pessoais na agenda", async () => {
    const result = await getAgenda(STUDENT_ID, { month: 6, year: 2026 });

    expect(result.eventosMentoria).toBe(1);
    expect(result.itensPessoais).toBe(1);
    expect(result.agenda).toHaveLength(2);
    expect(result.agenda[0].source).toBe("mentoria");
    expect(result.agenda[1].source).toBe("pessoal");
  });

  it("atualiza apenas item do próprio aluno", async () => {
    PlanoEstudoItem.findOne.mockResolvedValue({
      _id: ITEM_ID,
      aluno: STUDENT_ID,
      startAt: new Date("2026-06-24T10:00:00.000Z"),
      endAt: new Date("2026-06-24T11:00:00.000Z"),
    });
    PlanoEstudoItem.updateOne.mockResolvedValue({});

    const result = await updateItem(STUDENT_ID, ITEM_ID, { title: "Revisar Cypress" });

    expect(PlanoEstudoItem.updateOne).toHaveBeenCalled();
    expect(result.title).toBe("Revisar testes");
    expect(syncCouponsForStudents).toHaveBeenCalledWith([STUDENT_ID], {
      occurredAt: expect.any(Date),
    });
  });

  it("bloqueia conclusão de tarefa futura no checklist", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-06-24T12:00:00.000Z"));
    PlanoEstudoItem.findOne.mockResolvedValue({
      _id: ITEM_ID,
      aluno: STUDENT_ID,
      startAt: new Date("2026-06-26T10:00:00.000Z"),
      endAt: new Date("2026-06-26T11:00:00.000Z"),
      plannedDateKey: "2026-06-26",
      completedAt: null,
    });

    await expect(updateItem(STUDENT_ID, ITEM_ID, { completed: true })).rejects.toMatchObject({
      statusCode: 400,
      message: "Só é possível concluir tarefas de hoje ou de datas anteriores.",
    });
  });

  it("exclui item pessoal do aluno", async () => {
    PlanoEstudoItem.findOne.mockResolvedValue({ _id: ITEM_ID, aluno: STUDENT_ID });
    PlanoEstudoItem.updateOne.mockResolvedValue({});

    await deleteItem(STUDENT_ID, ITEM_ID);

    expect(PlanoEstudoItem.updateOne).toHaveBeenCalledWith(
      { _id: ITEM_ID },
      expect.objectContaining({ status: "inativo", deletedAt: expect.any(Date) })
    );
    expect(syncCouponsForStudents).toHaveBeenCalledWith([STUDENT_ID], {
      occurredAt: expect.any(Date),
    });
  });

  it("marca apenas um dia por janela para calcular pontuação do checklist", () => {
    const result = buildChecklistSummary([
      {
        _id: "1",
        aluno: STUDENT_ID,
        startAt: new Date("2026-06-24T10:00:00.000Z"),
        plannedDateKey: "2026-06-24",
        scoreWindowStartKey: "2026-06-24",
        completedAt: new Date("2026-06-24T11:00:00.000Z"),
      },
      {
        _id: "2",
        aluno: STUDENT_ID,
        startAt: new Date("2026-06-24T14:00:00.000Z"),
        plannedDateKey: "2026-06-24",
        scoreWindowStartKey: "2026-06-24",
        completedAt: new Date("2026-06-24T15:00:00.000Z"),
      },
      {
        _id: "3",
        aluno: STUDENT_ID,
        startAt: new Date("2026-06-25T10:00:00.000Z"),
        plannedDateKey: "2026-06-25",
        scoreWindowStartKey: "2026-06-24",
        completedAt: new Date("2026-06-25T11:00:00.000Z"),
      },
    ]);

    expect(result.totalTarefas).toBe(3);
    expect(result.tarefasConcluidas).toBe(3);
    expect(result.diasComCheck).toBe(2);
    expect(result.totalPontos).toBe(1);
    expect(result.semanas[0]).toMatchObject({
      inicio: "2026-06-24",
      fim: "2026-06-30",
      diasComCheck: 2,
      pontos: 1,
    });
  });
});
