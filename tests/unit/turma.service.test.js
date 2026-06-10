jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { enrollStudent } = require("../../src/services/turma.service");

const turmaId = "6814f12ab3f34872f7558f49";
const studentId = "6814f12ab3f34872f7558f50";

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Professor",
    email: "professor@email.com",
    role: "professor",
    status: "ativo",
    turmas: [],
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
    _id: { toString: () => studentId },
    name: "Aluno Teste",
    email: "aluno@email.com",
    role: "aluno",
    status: "ativo",
    turmas: [],
    ...overrides,
  };

  student.save = jest.fn().mockImplementation(() => Promise.resolve(student));
  return student;
}

describe("turma.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite que admin matricule aluno ativo em turma ativa", async () => {
    const turma = makeTurma();
    const student = makeStudent();
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(turma);
    User.findOne.mockResolvedValue(student);

    const result = await enrollStudent("admin-1", turmaId, { studentId });

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(Turma.findById).toHaveBeenCalledWith(turmaId);
    expect(User.findOne).toHaveBeenCalledWith({ _id: studentId, role: "aluno" });
    expect(student.turmas).toEqual([turma._id]);
    expect(student.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: `${turmaId}:${studentId}`,
      turmaId,
      studentId,
      status: "ativa",
      student: {
        id: studentId,
        name: "Aluno Teste",
        email: "aluno@email.com",
        status: "ativo",
      },
      turma: {
        id: turmaId,
        name: "Turma Frontend",
        status: "ativa",
      },
    });
  });

  it("permite usar alunoId no corpo da requisição", async () => {
    const student = makeStudent({ turmas: undefined });
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    Turma.findById.mockResolvedValue(makeTurma({ id: turmaId }));
    User.findOne.mockResolvedValue(student);

    const result = await enrollStudent("teacher-1", turmaId, { alunoId: studentId });

    expect(student.turmas).toHaveLength(1);
    expect(student.turmas[0].toString()).toBe(turmaId);
    expect(result.studentId).toBe(studentId);
    expect(result.turmaId).toBe(turmaId);
  });

  it("impede matrícula duplicada para o mesmo aluno na mesma turma", async () => {
    const student = makeStudent({ turmas: [turmaId] });
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(makeTurma());
    User.findOne.mockResolvedValue(student);

    await expect(enrollStudent("admin-1", turmaId, { studentId })).rejects.toMatchObject({
      statusCode: 409,
      message: "Aluno já matriculado nesta turma.",
    });

    expect(student.save).not.toHaveBeenCalled();
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(enrollStudent("student-actor", turmaId, { studentId })).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode matricular alunos em turmas.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(enrollStudent("missing-user", turmaId, { studentId })).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });
  });

  it("retorna 404 para id de turma inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(enrollStudent("admin-1", "id-invalido", { studentId })).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 quando turma não existe", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(null);

    await expect(enrollStudent("admin-1", turmaId, { studentId })).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });
  });

  it("rejeita turma que não está ativa", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(makeTurma({ status: "encerrada" }));

    await expect(enrollStudent("admin-1", turmaId, { studentId })).rejects.toMatchObject({
      statusCode: 400,
      message: "Turma deve estar ativa para matrícula.",
    });

    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("retorna 404 quando turma está marcada como deletada", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(makeTurma({ deletedAt: new Date("2026-09-01T00:00:00.000Z") }));

    await expect(enrollStudent("admin-1", turmaId, { studentId })).rejects.toMatchObject({
      statusCode: 404,
      message: "Turma não encontrada.",
    });

    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("rejeita payload sem studentId", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(enrollStudent("admin-1", turmaId, {})).rejects.toMatchObject({
      statusCode: 400,
      message: "studentId é obrigatório.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 para id de aluno inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(enrollStudent("admin-1", turmaId, { studentId: "id-invalido" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Aluno não encontrado.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
  });

  it("retorna 404 quando aluno não existe", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(makeTurma());
    User.findOne.mockResolvedValue(null);

    await expect(enrollStudent("admin-1", turmaId, { studentId })).rejects.toMatchObject({
      statusCode: 404,
      message: "Aluno não encontrado.",
    });
  });

  it("rejeita aluno que não está ativo", async () => {
    const student = makeStudent({ status: "inativo" });
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.findById.mockResolvedValue(makeTurma());
    User.findOne.mockResolvedValue(student);

    await expect(enrollStudent("admin-1", turmaId, { studentId })).rejects.toMatchObject({
      statusCode: 400,
      message: "Aluno deve estar ativo para matrícula.",
    });

    expect(student.save).not.toHaveBeenCalled();
  });

  it("rejeita payload que não é objeto", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(enrollStudent("admin-1", turmaId, null)).rejects.toMatchObject({
      statusCode: 400,
      message: "Corpo da requisição deve ser um objeto JSON.",
    });
  });
});
