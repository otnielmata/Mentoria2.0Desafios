jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { createStudent } = require("../../src/services/student.service");

const turmaId = "507f1f77bcf86cd799439011";

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Professor",
    email: "professor@email.com",
    role: "professor",
    status: "ativo",
    passwordHash: "hash-antigo",
    ...overrides,
  };
}

describe("student.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue("senha-hash");
  });

  it("permite que admin cadastre aluno ativo sem expor senha", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue(
      makeUser({
        id: "student-1",
        name: "Aluno Novo",
        email: "aluno@email.com",
        role: "aluno",
        passwordHash: "senha-hash",
        turmas: [],
      })
    );

    const result = await createStudent("admin-1", {
      name: "  Aluno Novo  ",
      email: " ALUNO@EMAIL.COM ",
      password: "123456",
    });

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(User.findOne).toHaveBeenCalledWith({ email: "aluno@email.com" });
    expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);
    expect(User.create).toHaveBeenCalledWith({
      name: "Aluno Novo",
      email: "aluno@email.com",
      passwordHash: "senha-hash",
      role: "aluno",
      status: "ativo",
      turmas: [],
    });
    expect(result).toEqual({
      id: "student-1",
      name: "Aluno Novo",
      email: "aluno@email.com",
      role: "aluno",
      status: "ativo",
    });
    expect(result.password).toBeUndefined();
    expect(result.passwordHash).toBeUndefined();
  });

  it("permite que professor cadastre aluno com turma inicial existente", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    User.findOne.mockResolvedValue(null);
    Turma.findById.mockResolvedValue({ _id: turmaId, name: "Turma Frontend" });
    User.create.mockResolvedValue(
      makeUser({
        id: "student-1",
        name: "Aluno Novo",
        email: "aluno@email.com",
        role: "aluno",
        passwordHash: "senha-hash",
        turmas: [turmaId],
      })
    );

    const result = await createStudent("teacher-1", {
      name: "Aluno Novo",
      email: "aluno@email.com",
      password: "123456",
      turmaId,
    });

    expect(Turma.findById).toHaveBeenCalledWith(turmaId);
    expect(User.create).toHaveBeenCalledWith({
      name: "Aluno Novo",
      email: "aluno@email.com",
      passwordHash: "senha-hash",
      role: "aluno",
      status: "ativo",
      turmas: [turmaId],
    });
    expect(result.turmas).toEqual([turmaId]);
  });

  it("rejeita cadastro feito por usuário que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(
      createStudent("student-actor", {
        name: "Aluno Novo",
        email: "aluno@email.com",
        password: "123456",
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode cadastrar alunos.",
    });

    expect(User.findOne).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(
      createStudent("missing-user", {
        name: "Aluno Novo",
        email: "aluno@email.com",
        password: "123456",
      })
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });
  });

  it("rejeita e-mail já cadastrado", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.findOne.mockResolvedValue(makeUser({ email: "aluno@email.com" }));

    await expect(
      createStudent("admin-1", {
        name: "Aluno Novo",
        email: "aluno@email.com",
        password: "123456",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "E-mail já está em uso.",
    });

    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejeita turma inicial inválida", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.findOne.mockResolvedValue(null);

    await expect(
      createStudent("admin-1", {
        name: "Aluno Novo",
        email: "aluno@email.com",
        password: "123456",
        turmaId: "turma-invalida",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Turma inicial inválida.",
    });

    expect(Turma.findById).not.toHaveBeenCalled();
    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejeita turma inicial inexistente", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.findOne.mockResolvedValue(null);
    Turma.findById.mockResolvedValue(null);

    await expect(
      createStudent("admin-1", {
        name: "Aluno Novo",
        email: "aluno@email.com",
        password: "123456",
        turmaId,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Turma inicial não encontrada.",
    });

    expect(User.create).not.toHaveBeenCalled();
  });

  it("rejeita payload que não é objeto", async () => {
    await expect(createStudent("admin-1", null)).rejects.toMatchObject({
      statusCode: 400,
      message: "Corpo da requisição deve ser um objeto JSON.",
    });

    expect(User.findById).not.toHaveBeenCalled();
  });

  it("converte erro de índice único do banco em conflito de e-mail", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.findOne.mockResolvedValue(null);
    User.create.mockRejectedValue({ code: 11000 });

    await expect(
      createStudent("admin-1", {
        name: "Aluno Novo",
        email: "aluno@email.com",
        password: "123456",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "E-mail já está em uso.",
    });
  });
});
