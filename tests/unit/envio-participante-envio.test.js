jest.mock("../../src/models/desafio.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/envio-desafio.model", () => ({
  create: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../src/models/participante-envio.model", () => ({
  create: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

const Desafio = require("../../src/models/desafio.model");
const EnvioDesafio = require("../../src/models/envio-desafio.model");
const ParticipanteEnvio = require("../../src/models/participante-envio.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { createEnvioDesafio, updateParticipantes } = require("../../src/services/envio-desafio.service");

const STUDENT_ID = "6814f12ab3f34872f7558f40";
const PARTICIPANT_ID = "6814f12ab3f34872f7558f41";
const SECOND_PARTICIPANT_ID = "6814f12ab3f34872f7558f42";
const DESAFIO_ID = "6814f12ab3f34872f7558f43";
const TURMA_ID = "6814f12ab3f34872f7558f44";
const ENVIO_ID = "6814f12ab3f34872f7558f45";

function makeEnvio(overrides = {}) {
  return {
    _id: ENVIO_ID,
    desafio: DESAFIO_ID,
    turma: TURMA_ID,
    aluno: STUDENT_ID,
    description: "Entrega em grupo",
    type: "grupo",
    evidencias: ["https://exemplo.com"],
    participantes: [PARTICIPANT_ID],
    status: "pendente",
    save: jest.fn().mockImplementation(async function save() {
      return this;
    }),
    ...overrides,
  };
}

describe("envio-desafio.service participantes_envio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "aluno", status: "ativo" });
    User.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: PARTICIPANT_ID, role: "aluno", status: "ativo" },
        { _id: SECOND_PARTICIPANT_ID, role: "aluno", status: "ativo" },
      ]),
    });
    Turma.findById.mockResolvedValue({ _id: TURMA_ID, status: "ativa" });
    Desafio.findById.mockResolvedValue({
      _id: DESAFIO_ID,
      type: "grupo",
      maxParticipantes: 5,
      status: "ativo",
    });
    EnvioDesafio.create.mockImplementation(async (payload) => ({ _id: ENVIO_ID, ...payload }));
    ParticipanteEnvio.updateMany.mockResolvedValue({});
    ParticipanteEnvio.create.mockResolvedValue([]);
  });

  it("persiste participantes em ParticipanteEnvio ao criar envio em grupo", async () => {
    User.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: PARTICIPANT_ID, role: "aluno", status: "ativo" }]),
    });

    const result = await createEnvioDesafio(STUDENT_ID, {
      desafioId: DESAFIO_ID,
      turmaId: TURMA_ID,
      description: "Entrega em grupo",
      type: "grupo",
      evidencias: ["https://exemplo.com"],
      participantes: [PARTICIPANT_ID],
    });

    expect(ParticipanteEnvio.updateMany).toHaveBeenCalledWith(
      { envio: ENVIO_ID, status: "ativo" },
      { status: "removido", removedAt: expect.any(Date) }
    );
    expect(ParticipanteEnvio.create).toHaveBeenCalledWith([
      { envio: ENVIO_ID, aluno: PARTICIPANT_ID, status: "ativo" },
    ]);
    expect(result.participantes).toEqual([PARTICIPANT_ID]);
  });

  it("substitui participantes ativos ao alterar envio em grupo", async () => {
    const envio = makeEnvio({
      desafio: {
        _id: DESAFIO_ID,
        type: "grupo",
        maxParticipantes: 5,
      },
    });
    EnvioDesafio.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(envio),
    });

    const result = await updateParticipantes(STUDENT_ID, ENVIO_ID, {
      participantes: [PARTICIPANT_ID, SECOND_PARTICIPANT_ID],
    });

    expect(envio.save).toHaveBeenCalled();
    expect(ParticipanteEnvio.updateMany).toHaveBeenCalledWith(
      { envio: ENVIO_ID, status: "ativo" },
      { status: "removido", removedAt: expect.any(Date) }
    );
    expect(ParticipanteEnvio.create).toHaveBeenCalledWith([
      { envio: ENVIO_ID, aluno: PARTICIPANT_ID, status: "ativo" },
      { envio: ENVIO_ID, aluno: SECOND_PARTICIPANT_ID, status: "ativo" },
    ]);
    expect(result.participantes).toEqual([PARTICIPANT_ID, SECOND_PARTICIPANT_ID]);
  });
});
