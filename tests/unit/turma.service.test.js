jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { closeTurma } = require("../../src/services/turma.service");

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
  const turma = {
    _id: { toString: () => validTurmaId },
    name: "Turma Frontend",
    status: "ativa",
    startDate: new Date("2026-07-01T00:00:00.000Z"),
    endDate: new Date("2026-08-01T00:00:00.000Z"),
    alunos: ["student-1"],
    submissoes: ["submission-1"],
    pontuacoes: ["score-1"],
    ...overrides,
  };

  turma.save = jest.fn().mockImplementation(() => Promise.resolve(turma));
  return turma;
}

describe("turma.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite que admin encerre turma ativa preservando vínculos históricos", async () => {
    const turma = makeTurma();
    const originalAlunos = turma.alunos;
    const originalSubmissoes = turma.submissoes;
    const originalPontuacoes = turma.pontuacoes;
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    const result = await closeTurma("admin-1", validTurmaId);

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(Turma.findById).toHaveBeenCalledWith(validTurmaId);
    expect(turma.status).toBe("encerrada");
    expect(turma.alunos).toBe(originalAlunos);
    expect(turma.submissoes).toBe(originalSubmissoes);
    expect(turma.pontuacoes).toBe(originalPontuacoes);
    expect(turma.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: validTurmaId,
      name: "Turma Frontend",
      status: "encerrada",
      startDate: "2026-07-01T00:00:00.000Z",
      endDate: "2026-08-01T00:00:00.000Z",
    });
  });

  it("permite que professor encerre turma existente sem datas", async () => {
    const turma = makeTurma({
      id: validTurmaId,
      name: "Turma Backend",
      startDate: undefined,
      endDate: undefined,
    });
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    Turma.findById.mockResolvedValue(turma);

    const result = await closeTurma("teacher-1", validTurmaId);

    expect(result).toEqual({
      id: validTurmaId,
      name: "Turma Backend",
      status: "encerrada",
    });
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(closeTurma("student-1", validTurmaId)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode encerrar turmas.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(closeTurma("missing-user", validTurmaId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 para id de turma inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(closeTurma("admin-1", "id-invalido")).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 quando turma não existe", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(null);

    await expect(closeTurma("admin-1", validTurmaId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });
  });

  it("retorna 404 quando turma está marcada como deletada", async () => {
    const turma = makeTurma({ deletedAt: new Date("2026-09-01T00:00:00.000Z") });
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    await expect(closeTurma("admin-1", validTurmaId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(turma.save).not.toHaveBeenCalled();
  });

  it("retorna 404 quando turma tem status de deleção", async () => {
    const turma = makeTurma({ status: "deletada" });
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);

    await expect(closeTurma("admin-1", validTurmaId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(turma.save).not.toHaveBeenCalled();
  });
});
