jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { getTurmaById } = require("../../src/services/turma.service");

const validTurmaId = "6814f12ab3f34872f7558f49";

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
    _id: { toString: () => validTurmaId },
    name: "Turma Frontend",
    status: "ativa",
    ...overrides,
  };
}

function mockFindById(turma) {
  const chain = {
    lean: jest.fn().mockResolvedValue(turma),
  };

  Turma.findById.mockReturnValue(chain);
  return chain;
}

describe("turma.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite que admin visualize turma existente com datas e quantidade de alunos", async () => {
    const startDate = new Date("2026-07-01T00:00:00.000Z");
    const endDate = new Date("2026-08-01T00:00:00.000Z");
    const turma = makeTurma({ startDate, endDate });
    mockFindById(turma);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.countDocuments.mockResolvedValue(24);

    const result = await getTurmaById("admin-1", validTurmaId);

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(Turma.findById).toHaveBeenCalledWith(validTurmaId);
    expect(User.countDocuments).toHaveBeenCalledWith({
      role: "aluno",
      turmas: turma._id,
    });
    expect(result).toEqual({
      id: validTurmaId,
      name: "Turma Frontend",
      status: "ativa",
      studentCount: 24,
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-08-01T00:00:00.000Z",
    });
  });

  it("permite que professor visualize turma existente sem datas", async () => {
    mockFindById(
      makeTurma({
        id: validTurmaId,
        name: "Turma Backend",
      })
    );
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    User.countDocuments.mockResolvedValue(0);

    const result = await getTurmaById("teacher-1", validTurmaId);

    expect(result).toEqual({
      id: validTurmaId,
      name: "Turma Backend",
      status: "ativa",
      studentCount: 0,
    });
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(getTurmaById("student-1", validTurmaId)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode visualizar turmas.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
    expect(User.countDocuments).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(getTurmaById("missing-user", validTurmaId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 para id de turma inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(getTurmaById("admin-1", "id-invalido")).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
    expect(User.countDocuments).not.toHaveBeenCalled();
  });

  it("retorna 404 quando turma não existe", async () => {
    mockFindById(null);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(getTurmaById("admin-1", validTurmaId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(User.countDocuments).not.toHaveBeenCalled();
  });
});
