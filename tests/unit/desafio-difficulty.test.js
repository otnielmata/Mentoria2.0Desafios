jest.mock("../../src/models/desafio.model", () => ({
  create: jest.fn(),
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
const { createDesafio } = require("../../src/services/desafio.service");

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
});
