jest.mock("../../src/models/aluno-turma.model", () => ({
  create: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
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
const { createTurma, enrollStudent, listTurmas, removeStudent } = require("../../src/services/turma.service");

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

  it("bloqueia cadastro de turma com data inicial posterior à final", async () => {
    await expect(
      createTurma(ADMIN_ID, {
        name: "Turma inválida",
        startDate: "2026-07-10",
        endDate: "2026-07-01",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "data_inicio não pode ser posterior à data_fim.",
    });

    expect(Turma.create).not.toHaveBeenCalled();
  });

  it("lista turmas com nome, data de início, data de fim e status", async () => {
    Turma.countDocuments.mockResolvedValue(1);
    Turma.find.mockReturnValue({
      sort: jest.fn(() => ({
        skip: jest.fn(() => ({
          limit: jest.fn(() => ({
            lean: jest.fn().mockResolvedValue([
              {
                _id: TURMA_ID,
                name: "Turma Agosto",
                startDate: new Date("2026-08-01T00:00:00.000Z"),
                endDate: new Date("2026-08-30T00:00:00.000Z"),
                status: "ativa",
                alunos: [],
              },
            ]),
          })),
        })),
      })),
    });

    const result = await listTurmas(ADMIN_ID);

    expect(result.turmas[0]).toMatchObject({
      data_fim: "2026-08-30T00:00:00.000Z",
      data_inicio: "2026-08-01T00:00:00.000Z",
      name: "Turma Agosto",
      nome: "Turma Agosto",
      status: "ativa",
    });
  });
});
