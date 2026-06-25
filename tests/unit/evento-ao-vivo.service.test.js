jest.mock("../../src/models/evento-ao-vivo.model", () => ({
  eventTypes: {
    live: "ao_vivo",
    recorded: "modulo_gravado",
    special: "conteudo_especial",
  },
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const EventoAoVivo = require("../../src/models/evento-ao-vivo.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const {
  createEvento,
  disableEvento,
  getEvento,
  listEventos,
  updateEvento,
} = require("../../src/services/evento-ao-vivo.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const STUDENT_ID = "6814f12ab3f34872f7558f42";
const TURMA_ID = "6814f12ab3f34872f7558f41";
const EVENTO_ID = "6814f12ab3f34872f7558f43";

function mockFindChain(items) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(items),
  };
}

describe("evento-ao-vivo.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: ADMIN_ID, role: "admin" }),
    });
    Turma.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: TURMA_ID, name: "Turma 4" }),
    });
    EventoAoVivo.create.mockResolvedValue({ _id: EVENTO_ID });
    EventoAoVivo.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: EVENTO_ID,
          title: "Lógica e Programação",
          description: null,
          startAt: new Date("2026-06-23T19:00:00.000Z"),
          endAt: new Date("2026-06-23T21:00:00.000Z"),
          type: "ao_vivo",
          turma: { _id: TURMA_ID, name: "Turma 4" },
          guestName: null,
          weekNumber: 4,
          link: null,
          status: "ativo",
        }),
      }),
    });
  });

  it("cadastra evento ao vivo para turma", async () => {
    const result = await createEvento(ADMIN_ID, {
      title: "Lógica e Programação",
      turmaId: TURMA_ID,
      startAt: "2026-06-23T19:00:00.000Z",
      endAt: "2026-06-23T21:00:00.000Z",
      type: "ao_vivo",
      weekNumber: 4,
    });

    expect(EventoAoVivo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Lógica e Programação",
        turma: TURMA_ID,
        type: "ao_vivo",
        weekNumber: 4,
      })
    );
    expect(result).toMatchObject({
      id: EVENTO_ID,
      title: "Lógica e Programação",
      source: "mentoria",
      editable: false,
      readOnly: true,
    });
  });

  it("bloqueia aluno de cadastrar evento ao vivo", async () => {
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: STUDENT_ID, role: "aluno" }),
    });

    await expect(
      createEvento(STUDENT_ID, {
        title: "Evento inválido",
        turmaId: TURMA_ID,
        startAt: "2026-06-23T19:00:00.000Z",
      })
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it("lista eventos da turma do aluno em modo somente leitura", async () => {
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: STUDENT_ID, role: "aluno" }),
    });
    Turma.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: TURMA_ID }]),
      }),
    });
    EventoAoVivo.countDocuments.mockResolvedValue(1);
    EventoAoVivo.find.mockReturnValue(
      mockFindChain([
        {
          _id: EVENTO_ID,
          title: "Mentoria Módulo 4",
          startAt: new Date("2026-06-20T12:00:00.000Z"),
          endAt: new Date("2026-06-20T14:00:00.000Z"),
          type: "ao_vivo",
          turma: { _id: TURMA_ID, name: "Turma 4" },
          status: "ativo",
        },
      ])
    );

    const result = await listEventos(STUDENT_ID, { month: 6, year: 2026 });

    expect(result.eventos[0]).toMatchObject({
      title: "Mentoria Módulo 4",
      readOnly: true,
      editable: false,
      source: "mentoria",
    });
  });

  it("impede aluno de visualizar evento de outra turma", async () => {
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: STUDENT_ID, role: "aluno" }),
    });
    Turma.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: "6814f12ab3f34872f7558f99" }]),
      }),
    });
    EventoAoVivo.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: EVENTO_ID,
          title: "Evento privado",
          startAt: new Date("2026-06-20T12:00:00.000Z"),
          type: "ao_vivo",
          turma: { _id: TURMA_ID, name: "Turma 4" },
          status: "ativo",
        }),
      }),
    });

    await expect(getEvento(STUDENT_ID, EVENTO_ID)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("atualiza evento ao vivo pelo admin", async () => {
    EventoAoVivo.findOne.mockResolvedValue({
      _id: EVENTO_ID,
      startAt: new Date("2026-06-23T19:00:00.000Z"),
      endAt: new Date("2026-06-23T21:00:00.000Z"),
    });
    EventoAoVivo.updateOne.mockResolvedValue({});

    const result = await updateEvento(ADMIN_ID, EVENTO_ID, {
      title: "Preparatório p/ Entrevistas",
      guestName: "Matheus Leão",
    });

    expect(EventoAoVivo.updateOne).toHaveBeenCalled();
    expect(result.title).toBe("Lógica e Programação");
  });

  it("inativa evento ao vivo pelo admin", async () => {
    EventoAoVivo.findOne.mockResolvedValue({ _id: EVENTO_ID });
    EventoAoVivo.updateOne.mockResolvedValue({});

    await disableEvento(ADMIN_ID, EVENTO_ID);

    expect(EventoAoVivo.updateOne).toHaveBeenCalledWith(
      { _id: EVENTO_ID },
      expect.objectContaining({ status: "inativo", deletedAt: expect.any(Date) })
    );
  });
});
