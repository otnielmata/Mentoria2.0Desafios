jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  create: jest.fn(),
}));

const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { createTurma } = require("../../src/services/turma.service");

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Professor",
    email: "professor@email.com",
    role: "professor",
    ...overrides,
  };
}

function makeTurma(overrides = {}) {
  return {
    id: "turma-1",
    name: "Turma Frontend",
    status: "ativa",
    ...overrides,
  };
}

describe("turma.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite que admin cadastre turma ativa com período válido", async () => {
    const startDate = new Date("2026-07-01T00:00:00.000Z");
    const endDate = new Date("2026-08-01T00:00:00.000Z");
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.create.mockResolvedValue(makeTurma({ startDate, endDate }));

    const result = await createTurma("admin-1", {
      name: "  Turma Frontend  ",
      startDate: "2026-07-01",
      endDate: "2026-08-01",
    });

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(Turma.create).toHaveBeenCalledWith({
      name: "Turma Frontend",
      status: "ativa",
      startDate,
      endDate,
    });
    expect(result).toEqual({
      id: "turma-1",
      name: "Turma Frontend",
      status: "ativa",
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-08-01T00:00:00.000Z",
    });
  });

  it("permite que professor cadastre turma sem datas", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    Turma.create.mockResolvedValue(makeTurma());

    const result = await createTurma("teacher-1", {
      name: "Turma Backend",
    });

    expect(Turma.create).toHaveBeenCalledWith({
      name: "Turma Backend",
      status: "ativa",
    });
    expect(result).toEqual({
      id: "turma-1",
      name: "Turma Frontend",
      status: "ativa",
    });
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(createTurma("student-actor", { name: "Turma Frontend" })).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode cadastrar turmas.",
    });

    expect(Turma.create).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(createTurma("missing-user", { name: "Turma Frontend" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });
  });

  it("rejeita nome vazio", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(createTurma("admin-1", { name: "   " })).rejects.toMatchObject({
      statusCode: 400,
      message: "Nome é obrigatório.",
    });

    expect(Turma.create).not.toHaveBeenCalled();
  });

  it("rejeita data inválida", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(
      createTurma("admin-1", {
        name: "Turma Frontend",
        startDate: "data-invalida",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Data inicial inválida.",
    });

    expect(Turma.create).not.toHaveBeenCalled();
  });

  it("rejeita data inicial posterior à data final", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(
      createTurma("admin-1", {
        name: "Turma Frontend",
        startDate: "2026-08-01",
        endDate: "2026-07-01",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Data inicial não pode ser posterior à data final.",
    });

    expect(Turma.create).not.toHaveBeenCalled();
  });

  it("rejeita payload que não é objeto", async () => {
    await expect(createTurma("admin-1", null)).rejects.toMatchObject({
      statusCode: 400,
      message: "Corpo da requisição deve ser um objeto JSON.",
    });

    expect(User.findById).not.toHaveBeenCalled();
  });
});
