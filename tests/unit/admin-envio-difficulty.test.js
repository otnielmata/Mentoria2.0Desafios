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
const Pontuacao = require("../../src/models/pontuacao.model");
const User = require("../../src/models/user.model");
const { evaluateEnvio } = require("../../src/services/admin-envio-desafio.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const ENVIO_ID = "6814f12ab3f34872f7558f41";
const DESAFIO_ID = "6814f12ab3f34872f7558f42";
const OWNER_ID = "6814f12ab3f34872f7558f43";

describe("admin-envio-desafio.service difficulty", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    Pontuacao.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
    Pontuacao.create.mockResolvedValue([]);
  });

  it("usa a pontuação calculada do desafio ao aprovar envio", async () => {
    const envio = {
      _id: ENVIO_ID,
      desafio: { _id: DESAFIO_ID, points: 50, difficulty: "extra" },
      turma: "6814f12ab3f34872f7558f44",
      aluno: OWNER_ID,
      description: "Entrega extra",
      type: "individual",
      evidencias: ["https://exemplo.com"],
      participantes: [],
      status: "pendente",
      save: jest.fn().mockImplementation(async function save() {
        return this;
      }),
    };
    EnvioDesafio.findById.mockResolvedValue(envio);

    const result = await evaluateEnvio(ADMIN_ID, ENVIO_ID, { decision: "aprovado" });

    expect(Pontuacao.create).toHaveBeenCalledWith([
      expect.objectContaining({
        envio: ENVIO_ID,
        desafio: DESAFIO_ID,
        aluno: OWNER_ID,
        pontos: 50,
        motivo: "desafio_extra",
      }),
    ]);
    expect(result.pontuacao).toEqual({
      pontos: 50,
      geradas: 1,
      ignoradas: 0,
      alunos: [OWNER_ID],
    });
  });
});
