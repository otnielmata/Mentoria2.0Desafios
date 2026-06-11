jest.mock("../../src/models/aluno-turma.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  updateOne: jest.fn(),
}));

const AlunoTurma = require("../../src/models/aluno-turma.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { enrollStudent, removeStudent } = require("../../src/services/turma.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const TURMA_ID = "6814f12ab3f34872f7558f41";
const STUDENT_ID = "6814f12ab3f34872f7558f42";

describe("turma.service alunos_turmas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    Turma.findById.mockResolvedValue({ _id: TURMA_ID, status: "ativa" });
    User.findOne.mockResolvedValue({ _id: STUDENT_ID, role: "aluno", status: "ativo" });
    AlunoTurma.findOne.mockResolvedValue(null);
    AlunoTurma.create.mockResolvedValue({});
    User.updateOne.mockResolvedValue({});
    Turma.updateOne.mockResolvedValue({});
  });

  it("cria vínculo em AlunoTurma ao matricular aluno", async () => {
    const result = await enrollStudent(ADMIN_ID, TURMA_ID, { studentId: STUDENT_ID });

    expect(AlunoTurma.create).toHaveBeenCalledWith({ aluno: STUDENT_ID, turma: TURMA_ID, status: "ativa" });
    expect(User.updateOne).toHaveBeenCalledWith({ _id: STUDENT_ID }, { $addToSet: { turmas: TURMA_ID } });
    expect(Turma.updateOne).toHaveBeenCalledWith({ _id: TURMA_ID }, { $addToSet: { alunos: STUDENT_ID } });
    expect(result).toEqual({ id: `${TURMA_ID}:${STUDENT_ID}`, turmaId: TURMA_ID, studentId: STUDENT_ID, status: "ativa" });
  });

  it("bloqueia matrícula ativa duplicada para o mesmo aluno e turma", async () => {
    AlunoTurma.findOne.mockResolvedValue({ aluno: STUDENT_ID, turma: TURMA_ID, status: "ativa" });

    await expect(enrollStudent(ADMIN_ID, TURMA_ID, { studentId: STUDENT_ID })).rejects.toMatchObject({
      statusCode: 409,
      message: "Aluno já matriculado nesta turma.",
    });

    expect(AlunoTurma.create).not.toHaveBeenCalled();
    expect(User.updateOne).not.toHaveBeenCalled();
    expect(Turma.updateOne).not.toHaveBeenCalled();
  });

  it("marca vínculo como removido ao remover aluno da turma", async () => {
    AlunoTurma.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ aluno: STUDENT_ID, turma: TURMA_ID, status: "removida" }),
    });

    const result = await removeStudent(ADMIN_ID, TURMA_ID, STUDENT_ID);

    expect(AlunoTurma.findOneAndUpdate).toHaveBeenCalledWith(
      { aluno: STUDENT_ID, turma: TURMA_ID, status: "ativa" },
      { status: "removida", removedAt: expect.any(Date) },
      { new: true }
    );
    expect(User.updateOne).toHaveBeenCalledWith({ _id: STUDENT_ID }, { $pull: { turmas: TURMA_ID } });
    expect(Turma.updateOne).toHaveBeenCalledWith({ _id: TURMA_ID }, { $pull: { alunos: STUDENT_ID } });
    expect(result.status).toBe("removida");
  });
});
