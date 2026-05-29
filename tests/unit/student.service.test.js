jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

const User = require("../../src/models/user.model");
const { getStudentById } = require("../../src/services/student.service");

const studentId = "507f1f77bcf86cd799439011";
const turmaId = "507f1f77bcf86cd799439012";

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Professor",
    email: "professor@email.com",
    role: "professor",
    status: "ativo",
    passwordHash: "hash-secreto",
    ...overrides,
  };
}

function mockFindOneResult(student) {
  const query = {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(student),
  };

  User.findOne.mockReturnValue(query);
  return query;
}

describe("student.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna detalhes do aluno para admin sem campos sensíveis", async () => {
    const student = makeUser({
      _id: studentId,
      id: studentId,
      name: "Maria Silva",
      email: "maria@email.com",
      role: "aluno",
      turmas: [{ _id: turmaId, name: "Turma Frontend" }],
      pointsSummary: { total: 120, available: 90 },
    });
    const query = mockFindOneResult(student);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    const result = await getStudentById("admin-1", studentId);

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(User.findOne).toHaveBeenCalledWith({ _id: studentId, role: "aluno" });
    expect(query.select).toHaveBeenCalledWith("-password -passwordHash");
    expect(query.populate).toHaveBeenCalledWith("turmas");
    expect(result).toEqual({
      id: studentId,
      name: "Maria Silva",
      email: "maria@email.com",
      role: "aluno",
      status: "ativo",
      turmas: [{ id: turmaId, name: "Turma Frontend" }],
      pointsSummary: { total: 120, available: 90 },
    });
    expect(result.password).toBeUndefined();
    expect(result.passwordHash).toBeUndefined();
  });

  it("retorna aluno sem turmas e sem resumo de pontos quando não disponíveis", async () => {
    mockFindOneResult(
      makeUser({
        _id: studentId,
        id: studentId,
        name: "Maria Silva",
        email: "maria@email.com",
        role: "aluno",
        turmas: [],
      })
    );
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));

    const result = await getStudentById("teacher-1", studentId);

    expect(result).toEqual({
      id: studentId,
      name: "Maria Silva",
      email: "maria@email.com",
      role: "aluno",
      status: "ativo",
    });
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(getStudentById("student-actor", studentId)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode visualizar alunos.",
    });

    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(getStudentById("missing-user", studentId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });
  });

  it("retorna 404 quando o id do aluno é inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(getStudentById("admin-1", "id-invalido")).rejects.toMatchObject({
      statusCode: 404,
      message: "Aluno não encontrado.",
    });

    expect(User.findOne).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o aluno não existe", async () => {
    mockFindOneResult(null);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(getStudentById("admin-1", studentId)).rejects.toMatchObject({
      statusCode: 404,
      message: "Aluno não encontrado.",
    });
  });
});
