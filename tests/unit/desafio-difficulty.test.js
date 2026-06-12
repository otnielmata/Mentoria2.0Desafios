jest.mock("../../src/models/desafio.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
}));

jest.mock("../../src/models/pilar.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const Desafio = require("../../src/models/desafio.model");
const Pilar = require("../../src/models/pilar.model");
const User = require("../../src/models/user.model");
const { createDesafio, listDesafios } = require("../../src/services/desafio.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const PILAR_ID = "6814f12ab3f34872f7558f41";

describe("desafio.service difficulty", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    Pilar.findById.mockResolvedValue({ _id: PILAR_ID, status: "ativo" });
    Desafio.create.mockImplementation(async (payload) => ({ _id: "6814f12ab3f34872f7558f42", ...payload }));
  });

  it("usa a pontuação padrão quando dificuldade é informada sem pontos explícitos", async () => {
    const desafio = await createDesafio(ADMIN_ID, {
      pilarId: PILAR_ID,
      title: "Publicar artigo",
      description: "Compartilhar aprendizado.",
      difficulty: "dificil",
      type: "individual",
    });

    expect(Desafio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulty: "dificil",
        points: 30,
        maxParticipantes: 1,
      })
    );
    expect(desafio.points).toBe(30);
  });

  it("preserva pontuação customizada quando informada", async () => {
    await createDesafio(ADMIN_ID, {
      pilarId: PILAR_ID,
      title: "Ação extra",
      description: "Entrega especial.",
      difficulty: "facil",
      points: 75,
      type: "grupo",
      maxParticipantes: 5,
    });

    expect(Desafio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulty: "facil",
        points: 75,
        maxParticipantes: 5,
      })
    );
  });

  it("lista apenas desafios ativos para aluno autenticado com paginação", async () => {
    User.findById.mockResolvedValue({ _id: "6814f12ab3f34872f7558f50", role: "aluno" });
    Desafio.countDocuments.mockResolvedValue(1);
    const lean = jest.fn().mockResolvedValue([
      {
        _id: "6814f12ab3f34872f7558f51",
        pilar: { _id: PILAR_ID, name: "Prática", status: "ativo" },
        title: "Praticar API",
        description: "Executar desafio técnico.",
        difficulty: "facil",
        points: 10,
        type: "individual",
        maxParticipantes: 1,
        status: "ativo",
      },
    ]);
    const limit = jest.fn(() => ({ lean }));
    const skip = jest.fn(() => ({ limit }));
    const sort = jest.fn(() => ({ skip }));
    const populate = jest.fn(() => ({ sort }));
    Desafio.find.mockReturnValue({ populate });

    const result = await listDesafios("6814f12ab3f34872f7558f50", { page: "1", limit: "10" });

    expect(Desafio.countDocuments).toHaveBeenCalledWith({ status: "ativo" });
    expect(Desafio.find).toHaveBeenCalledWith({ status: "ativo" });
    expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    expect(result.desafios[0].status).toBe("ativo");
  });
});
