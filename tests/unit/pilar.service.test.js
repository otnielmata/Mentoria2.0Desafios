jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/pilar.model", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const Pilar = require("../../src/models/pilar.model");
const User = require("../../src/models/user.model");
const { createPilar } = require("../../src/services/pilar.service");

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Professor",
    email: "professor@email.com",
    role: "professor",
    ...overrides,
  };
}

function makePilar(overrides = {}) {
  return {
    id: "pilar-1",
    name: "Clareza",
    normalizedName: "clareza",
    status: "ativo",
    ...overrides,
  };
}

describe("pilar.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite que admin cadastre pilar ativo com descrição", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Pilar.findOne.mockResolvedValue(null);
    Pilar.create.mockResolvedValue(
      makePilar({
        name: "Execução",
        normalizedName: "execucao",
        description: "Pilar de execução consistente",
      })
    );

    const result = await createPilar("admin-1", {
      name: "  Execução  ",
      description: "  Pilar de execução consistente  ",
    });

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(Pilar.findOne).toHaveBeenCalledWith({
      normalizedName: "execucao",
      status: "ativo",
    });
    expect(Pilar.create).toHaveBeenCalledWith({
      name: "Execução",
      normalizedName: "execucao",
      description: "Pilar de execução consistente",
      status: "ativo",
    });
    expect(result).toEqual({
      id: "pilar-1",
      name: "Execução",
      description: "Pilar de execução consistente",
      status: "ativo",
    });
  });

  it("permite que professor cadastre pilar sem descrição", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    Pilar.findOne.mockResolvedValue(null);
    Pilar.create.mockResolvedValue(makePilar({ description: undefined }));

    const result = await createPilar("teacher-1", {
      name: "Clareza",
    });

    expect(Pilar.create).toHaveBeenCalledWith({
      name: "Clareza",
      normalizedName: "clareza",
      description: undefined,
      status: "ativo",
    });
    expect(result).toEqual({
      id: "pilar-1",
      name: "Clareza",
      status: "ativo",
    });
  });

  it("normaliza espaços do nome para validar duplicidade ativa", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Pilar.findOne.mockResolvedValue(null);
    Pilar.create.mockResolvedValue(
      makePilar({
        name: "Foco Estratégico",
        normalizedName: "foco estrategico",
      })
    );

    await createPilar("admin-1", {
      name: "  Foco    Estratégico  ",
    });

    expect(Pilar.findOne).toHaveBeenCalledWith({
      normalizedName: "foco estrategico",
      status: "ativo",
    });
    expect(Pilar.create).toHaveBeenCalledWith({
      name: "Foco Estratégico",
      normalizedName: "foco estrategico",
      description: undefined,
      status: "ativo",
    });
  });

  it("bloqueia nome ativo duplicado", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Pilar.findOne.mockResolvedValue(makePilar());

    await expect(createPilar("admin-1", { name: "Clareza" })).rejects.toMatchObject({
      statusCode: 409,
      message: "Já existe um pilar ativo com este nome.",
    });

    expect(Pilar.create).not.toHaveBeenCalled();
  });

  it("converte erro de índice único em conflito de nome ativo", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Pilar.findOne.mockResolvedValue(null);
    Pilar.create.mockRejectedValue({ code: 11000 });

    await expect(createPilar("admin-1", { name: "Clareza" })).rejects.toMatchObject({
      statusCode: 409,
      message: "Já existe um pilar ativo com este nome.",
    });
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(createPilar("student-1", { name: "Clareza" })).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode cadastrar pilares.",
    });

    expect(Pilar.findOne).not.toHaveBeenCalled();
    expect(Pilar.create).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(createPilar("missing-user", { name: "Clareza" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });

    expect(Pilar.findOne).not.toHaveBeenCalled();
  });

  it("rejeita nome vazio", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(createPilar("admin-1", { name: "   " })).rejects.toMatchObject({
      statusCode: 400,
      message: "Nome é obrigatório.",
    });

    expect(Pilar.findOne).not.toHaveBeenCalled();
    expect(Pilar.create).not.toHaveBeenCalled();
  });

  it("rejeita descrição inválida", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(
      createPilar("admin-1", {
        name: "Clareza",
        description: 123,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Descrição deve ser um texto válido.",
    });

    expect(Pilar.findOne).not.toHaveBeenCalled();
  });

  it("rejeita payload que não é objeto", async () => {
    await expect(createPilar("admin-1", null)).rejects.toMatchObject({
      statusCode: 400,
      message: "Corpo da requisição deve ser um objeto JSON.",
    });

    expect(User.findById).not.toHaveBeenCalled();
  });
});
