jest.mock("../../src/models/aluno-turma.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/desafio.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../src/models/envio-desafio.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
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

const AlunoTurma = require("../../src/models/aluno-turma.model");
const Desafio = require("../../src/models/desafio.model");
const EnvioDesafio = require("../../src/models/envio-desafio.model");
const ParticipanteEnvio = require("../../src/models/participante-envio.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { createEnvioDesafio } = require("../../src/services/envio-desafio.service");

const STUDENT_ID = "6814f12ab3f34872f7558f40";
const PARTICIPANT_ID = "6814f12ab3f34872f7558f41";
const SECOND_PARTICIPANT_ID = "6814f12ab3f34872f7558f42";
const DESAFIO_ID = "6814f12ab3f34872f7558f43";
const TURMA_ID = "6814f12ab3f34872f7558f44";

describe("envio-desafio.service grupos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: STUDENT_ID, role: "aluno", status: "ativo" });
  });

  it("rejeita participantes duplicados em envio de grupo", async () => {
    await expect(
      createEnvioDesafio(STUDENT_ID, {
        desafioId: DESAFIO_ID,
        turmaId: TURMA_ID,
        type: "grupo",
        description: "Entrega em grupo",
        evidencias: ["https://evidencia.com"],
        participantes: [PARTICIPANT_ID, PARTICIPANT_ID],
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Participantes não podem conter duplicidades.",
    });

    expect(EnvioDesafio.create).not.toHaveBeenCalled();
  });

  it("cria envio em grupo com participantes ativos da mesma turma e limite incluindo responsável", async () => {
    Desafio.findById.mockResolvedValue({
      _id: DESAFIO_ID,
      status: "ativo",
      type: "grupo",
      maxParticipantes: 3,
    });
    Turma.findById.mockResolvedValue({ _id: TURMA_ID, status: "ativa" });
    User.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { _id: PARTICIPANT_ID, role: "aluno", status: "ativo" },
        { _id: SECOND_PARTICIPANT_ID, role: "aluno", status: "ativo" },
      ]),
    });
    AlunoTurma.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { aluno: PARTICIPANT_ID, turma: TURMA_ID, status: "ativa" },
        { aluno: SECOND_PARTICIPANT_ID, turma: TURMA_ID, status: "ativa" },
      ]),
    });
    EnvioDesafio.create.mockResolvedValue({
      _id: "6814f12ab3f34872f7558f45",
      desafio: DESAFIO_ID,
      turma: TURMA_ID,
      aluno: STUDENT_ID,
      description: "Entrega em grupo",
      type: "grupo",
      evidencias: ["https://evidencia.com"],
      participantes: [PARTICIPANT_ID, SECOND_PARTICIPANT_ID],
      status: "pendente",
    });

    const result = await createEnvioDesafio(STUDENT_ID, {
      desafioId: DESAFIO_ID,
      turmaId: TURMA_ID,
      type: "grupo",
      description: "Entrega em grupo",
      evidencias: ["https://evidencia.com"],
      participantes: [PARTICIPANT_ID, SECOND_PARTICIPANT_ID],
    });

    expect(AlunoTurma.find).toHaveBeenCalledWith({
      turma: TURMA_ID,
      aluno: { $in: [PARTICIPANT_ID, SECOND_PARTICIPANT_ID] },
      status: "ativa",
    });
    expect(ParticipanteEnvio.updateMany).toHaveBeenCalledWith(
      { envio: "6814f12ab3f34872f7558f45", status: "ativo" },
      { status: "removido", removedAt: expect.any(Date) }
    );
    expect(ParticipanteEnvio.create).toHaveBeenCalledWith([
      { envio: "6814f12ab3f34872f7558f45", aluno: PARTICIPANT_ID, status: "ativo" },
      { envio: "6814f12ab3f34872f7558f45", aluno: SECOND_PARTICIPANT_ID, status: "ativo" },
    ]);
    expect(result.status).toBe("pendente");
  });
});
