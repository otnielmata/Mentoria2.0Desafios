jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { removeStudentFromTurma } = require("../../src/services/turma.service");

const turmaId = "6814f12ab3f34872f7558f49";
const alunoId = "6814f12ab3f34872f7558f50";
const otherTurmaId = "6814f12ab3f34872f7558f51";

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
    _id: { toString: () => turmaId },
    name: "Turma Frontend",
    status: "ativa",
    ...overrides,
  };
}

function makeStudent(overrides = {}) {
  const student = {
    _id: { toString: () => alunoId },
    name: "Aluno Teste",
    email: "aluno@email.com",
    role: "aluno",
    status: "ativo",
    turmas: [turmaId, otherTurmaId],
    submissions: ["submission-1"],
    pointsSummary: { total: 10 },
    ...overrides,
  };

  student.save = jest.fn().mockImplementation(() => Promise.resolve(student));
  return student;
}

describe("turma.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite que admin remova vínculo existente preservando histórico do aluno", async () => {
    const turma = makeTurma();
    const student = makeStudent();
    const originalSubmissions = student.submissions;
    const originalPointsSummary = student.pointsSummary;
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);
    User.findOne.mockResolvedValue(student);

    const result = await removeStudentFromTurma("admin-1", turmaId, alunoId);

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(Turma.findById).toHaveBeenCalledWith(turmaId);
    expect(User.findOne).toHaveBeenCalledWith({ _id: alunoId, role: "aluno" });
    expect(student.turmas).toEqual([otherTurmaId]);
    expect(student.submissions).toBe(originalSubmissions);
    expect(student.pointsSummary).toBe(originalPointsSummary);
    expect(student.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: `${turmaId}:${alunoId}`,
      turmaId,
      studentId: alunoId,
      status: "removida",
      removed: true,
      student: {
        id: alunoId,
        name: "Aluno Teste",
        email: "aluno@email.com",
      },
      turma: {
        id: turmaId,
        name: "Turma Frontend",
        status: "ativa",
      },
    });
  });

  it("responde com sucesso idempotente quando vínculo não existe", async () => {
    const student = makeStudent({ turmas: [otherTurmaId] });
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    Turma.findById.mockResolvedValue(makeTurma({ id: turmaId }));
    User.findOne.mockResolvedValue(student);

    const result = await removeStudentFromTurma("teacher-1", turmaId, alunoId);

    expect(student.turmas).toEqual([otherTurmaId]);
    expect(student.save).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: `${turmaId}:${alunoId}`,
      turmaId,
      studentId: alunoId,
      status: "ausente",
      removed: false,
      student: {
        id: alunoId,
        name: "Aluno Teste",
        email: "aluno@email.com",
      },
      turma: {
        id: turmaId,
        name: "Turma Frontend",
        status: "ativa",
      },
    });
  });

  it("trata lista de turmas ausente como relação ausente", async () => {
    const student = makeStudent({ turmas: undefined });
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(makeTurma());
    User.findOne.mockResolvedValue(student);

    const result = await removeStudentFromTurma("admin-1", turmaId, alunoId);

    expect(student.save).not.toHaveBeenCalled();
    expect(result.removed).toBe(false);
    expect(result.status).toBe("ausente");
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(removeStudentFromTurma("student-actor", turmaId, alunoId)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode remover alunos de turmas.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(removeStudentFromTurma("missing-user", turmaId, alunoId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });
  });

  it("retorna 404 para id de turma inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(removeStudentFromTurma("admin-1", "id-invalido", alunoId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 para id de aluno inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(removeStudentFromTurma("admin-1", turmaId, "id-invalido")).rejects.toMatchObject({
      statusCode: 404,
      message: "Aluno não encontrado.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 quando turma não existe", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(null);

    await expect(removeStudentFromTurma("admin-1", turmaId, alunoId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });
  });

  it("retorna 404 quando turma está marcada como deletada", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(makeTurma({ deletedAt: new Date("2026-09-01T00:00:00.000Z") }));

    await expect(removeStudentFromTurma("admin-1", turmaId, alunoId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("retorna 404 quando aluno não existe", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(makeTurma());
    User.findOne.mockResolvedValue(null);

    await expect(removeStudentFromTurma("admin-1", turmaId, alunoId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Aluno não encontrado.",
    });
  });
});
