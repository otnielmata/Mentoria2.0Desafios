jest.mock("../../src/models/desafio.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/envio-desafio.model", () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../../src/models/participante-envio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const EnvioDesafio = require("../../src/models/envio-desafio.model");
const ParticipanteEnvio = require("../../src/models/participante-envio.model");
const Pontuacao = require("../../src/models/pontuacao.model");
const User = require("../../src/models/user.model");
const { evaluateEnvio } = require("../../src/services/admin-envio-desafio.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const ENVIO_ID = "6814f12ab3f34872f7558f41";
const DESAFIO_ID = "6814f12ab3f34872f7558f42";
const OWNER_ID = "6814f12ab3f34872f7558f43";
const PARTICIPANT_ID = "6814f12ab3f34872f7558f44";

describe("admin-envio-desafio.service participantes_envio", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    ParticipanteEnvio.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ aluno: PARTICIPANT_ID }]),
    });
    Pontuacao.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    Pontuacao.create.mockResolvedValue([]);
  });

  it("gera pontuação para responsável e participantes ativos da coleção ParticipanteEnvio", async () => {
    const envio = {
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 20, difficulty: "medio" },
      turma: "6814f12ab3f34872f7558f45",
      aluno: OWNER_ID,
      description: "Entrega em grupo",
      type: "grupo",
      evidencias: ["https://exemplo.com"],
      participantes: [],
      status: "pendente",
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    };
    EnvioDesafio.findById.mockResolvedValue(envio);

    const result = await evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado" });

    expect(ParticipanteEnvio.find).toHaveBeenCalledWith({ envio: ENVIO_ID, status: "ativo" });
    expect(Pontuacao.create).toHaveBeenCalledWith([
      expect.objectContaining({ aluno: OWNER_ID, pontos: 20, motivo: "desafio_medio" }),
      expect.objectContaining({ aluno: PARTICIPANT_ID, pontos: 20, motivo: "desafio_medio" }),
    ]);
    expect(result.pontuacao).toEqual({
      pontos: 20,
      geradas: 2,
      ignoradas: 0,
      alunos: [OWNER_ID, PARTICIPANT_ID],
    });
  });

  it("bloqueia reavaliação de envio já aprovado", async () => {
    EnvioDesafio.findById.mockResolvedValue({
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 20, difficulty: "medio" },
      aluno: OWNER_ID,
      type: "individual",
      status: "aprovado",
    });

    await expect(evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Envios aprovados não podem receber nova decisão.",
    });

    expect(Pontuacao.create).not.toHaveBeenCalled();
  });
});
