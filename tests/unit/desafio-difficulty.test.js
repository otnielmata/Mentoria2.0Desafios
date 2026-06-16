jest.mock("../../src/models/desafio.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
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
const { createDesafio, disableDesafio, listDesafios } = require("../../src/services/desafio.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const PILAR_ID = "6814f12ab3f34872f7558f41";

describe("desafio.service difficulty", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    Pilar.findById.mockResolvedValue({ _id: PILAR_ID, status: "ativo" });
    Desafio.create.mockImplementation(async (payload) => ({ _id: "6814f12ab3f34872f7558f42", ...payload }));
  });

  it("cadastra desafio com pontuação fixa explícita", async () => {
    const desafio = await createDesafio(ADMIN_ID, {
      pilarId: PILAR_ID,
      title: "Publicar artigo",
      description: "Compartilhar aprendizado.",
      difficulty: "dificil",
      points: 30,
      status: "ativo",
      type: "individual",
    });

    expect(Desafio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulty: "dificil",
        points: 30,
        maxParticipantes: 1,
        status: "ativo",
      })
    );
    expect(desafio.points).toBe(30);
  });

  it("rejeita cadastro de desafio sem pontuação fixa", async () => {
    await expect(
      createDesafio(ADMIN_ID, {
        pilarId: PILAR_ID,
        title: "Sem pontos",
        description: "Desafio sem pontuação fixa.",
        type: "individual",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "pontos é obrigatório para cadastro de desafio.",
    });

    expect(Desafio.create).not.toHaveBeenCalled();
  });

  it("rejeita máximo de participantes maior que 5", async () => {
    await expect(
      createDesafio(ADMIN_ID, {
        pilarId: PILAR_ID,
        title: "Grupo grande",
        description: "Desafio em grupo com limite inválido.",
        points: 20,
        type: "grupo",
        maxParticipantes: 6,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "max_participantes deve ser um número entre 1 e 5.",
    });

    expect(Desafio.create).not.toHaveBeenCalled();
  });

  it("preserva pontuação customizada quando informada", async () => {
    await createDesafio(ADMIN_ID, {
      pilarId: PILAR_ID,
      title: "Ação extra",
      description: "Entrega especial.",
      difficulty: "facil",
      points: 75,
      status: "ativo",
      type: "grupo",
      maxParticipantes: 5,
    });

    expect(Desafio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        difficulty: "facil",
        points: 75,
        maxParticipantes: 5,
        status: "ativo",
      })
    );
  });

  it("cadastra pontuação extra para apresentação ao vivo", async () => {
    const desafio = await createDesafio(ADMIN_ID, {
      pilarId: PILAR_ID,
      title: "Apresentar solução",
      description: "Mostrar a entrega em evento ao vivo.",
      points: 20,
      livePresentationPoints: 15,
      type: "grupo",
      maxParticipantes: 5,
    });

    expect(Desafio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        points: 20,
        livePresentationPoints: 15,
      })
    );
    expect(desafio.livePresentationPoints).toBe(15);
    expect(desafio.pontosApresentacaoAoVivo).toBe(15);
  });

  it("cadastra desafio recorrente com limite de pontos por período", async () => {
    const desafio = await createDesafio(ADMIN_ID, {
      pilarId: PILAR_ID,
      title: "Ajudar colega semanalmente",
      description: "Ação recorrente com limite de pontos.",
      points: 10,
      type: "individual",
      recorrencia: {
        enabled: true,
        periodo: "semanal",
        limitePontos: 20,
      },
    });

    expect(Desafio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recorrencia: {
          enabled: true,
          periodo: "semanal",
          limitePontos: 20,
          acaoAoExceder: "bloquear",
        },
      })
    );
    expect(desafio.recorrencia).toEqual({
      enabled: true,
      periodo: "semanal",
      limitePontos: 20,
      acaoAoExceder: "bloquear",
    });
  });

  it("apaga desafio usando status apagado", async () => {
    const lean = jest.fn().mockResolvedValue({
      _id: "6814f12ab3f34872f7558f52",
      pilar: { _id: PILAR_ID, name: "Prática", status: "ativo" },
      title: "Desafio antigo",
      description: "Não deve mais aparecer na lista padrão.",
      difficulty: "facil",
      points: 10,
      type: "individual",
      maxParticipantes: 1,
      status: "apagado",
    });
    const populate = jest.fn(() => ({ lean }));
    Desafio.findByIdAndUpdate.mockReturnValue({ populate });

    const result = await disableDesafio(ADMIN_ID, "6814f12ab3f34872f7558f52");

    expect(Desafio.findByIdAndUpdate).toHaveBeenCalledWith(
      "6814f12ab3f34872f7558f52",
      { status: "apagado" },
      { new: true }
    );
    expect(result.status).toBe("apagado");
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
