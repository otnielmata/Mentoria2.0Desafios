jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

jest.mock("../../src/models/aluno-turma.model", () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock("../../src/models/pontuacao.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  findById: jest.fn(),
  updateMany: jest.fn(),
  updateOne: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

const AlunoTurma = require("../../src/models/aluno-turma.model");
const bcrypt = require("bcryptjs");
const Pontuacao = require("../../src/models/pontuacao.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { createStudent, disableStudent, getStudent, listStudents, updateStudent } = require("../../src/services/student.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const STUDENT_ID = "6814f12ab3f34872f7558f42";
const TURMA_ID = "6814f12ab3f34872f7558f41";

function mockUserFindChain(records) {
  const lean = jest.fn().mockResolvedValue(records);
  const limit = jest.fn(() => ({ lean }));
  const skip = jest.fn(() => ({ limit }));
  const sort = jest.fn(() => ({ skip }));
  User.find.mockReturnValue({ sort });
  return { sort, skip, limit, lean };
}

describe("student.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
  });

  it("cadastra aluno salvando role/status e ocultando senha/hash", async () => {
    bcrypt.hash.mockResolvedValue("hash-seguro");
    Turma.findById.mockResolvedValue(null);
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: STUDENT_ID,
      id: STUDENT_ID,
      name: "Ana",
      email: "ana@email.com",
      passwordHash: "hash-seguro",
      role: "aluno",
      status: "inativo",
      turmas: [],
    });

    const result = await createStudent(ADMIN_ID, {
      email: "ANA@EMAIL.COM",
      name: "Ana",
      password: "123456",
      role: "aluno",
      status: "inativo",
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@email.com",
        name: "Ana",
        passwordHash: "hash-seguro",
        role: "aluno",
        status: "inativo",
      })
    );
    expect(result).toEqual({
      email: "ana@email.com",
      id: STUDENT_ID,
      name: "Ana",
      role: "aluno",
      status: "inativo",
      turmas: [],
    });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("lista alunos com filtros, busca textual e paginação", async () => {
    AlunoTurma.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ aluno: STUDENT_ID }]),
    });
    User.countDocuments.mockResolvedValue(1);
    const chain = mockUserFindChain([{ _id: STUDENT_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "ativo", turmas: [TURMA_ID] }]);

    const result = await listStudents(ADMIN_ID, {
      turmaId: TURMA_ID,
      status: "ativo",
      search: "ana",
      page: "2",
      limit: "5",
    });

    expect(User.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "aluno",
        status: "ativo",
        $and: expect.any(Array),
      })
    );
    expect(chain.skip).toHaveBeenCalledWith(5);
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(result.pagination).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 });
    expect(result.alunos[0]).not.toHaveProperty("passwordHash");
  });

  it("retorna aluno com resumo de pontuação sem campos sensíveis", async () => {
    User.findOne.mockReturnValue({
      populate: jest.fn(() => ({
        lean: jest.fn().mockResolvedValue({ _id: STUDENT_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "ativo", turmas: [] }),
      })),
    });
    Pontuacao.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([
        { envio: "envio-1", pontos: 10 },
        { envio: "envio-2", pontos: 20 },
      ]),
    });

    const result = await getStudent(ADMIN_ID, STUDENT_ID);

    expect(result.pontuacao).toEqual({ totalPontos: 30, desafiosAprovados: 2 });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("desativa aluno por status preservando histórico", async () => {
    User.findOneAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: STUDENT_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "inativo" }),
    });

    const result = await disableStudent(ADMIN_ID, STUDENT_ID);

    expect(User.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: STUDENT_ID, role: "aluno" },
      { status: "inativo" },
      { new: true }
    );
    expect(result.status).toBe("inativo");
  });

  it("edita aluno com nome, e-mail, senha, status e turma pelo perfil admin", async () => {
    bcrypt.hash.mockResolvedValue("nova-hash");
    Turma.findById.mockResolvedValue({ _id: TURMA_ID, name: "Turma 1" });
    User.findOne
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({ _id: STUDENT_ID, email: "ana@email.com", role: "aluno", turmas: [] }),
      })
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      });
    User.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: STUDENT_ID,
        name: "Ana Atualizada",
        email: "ana.nova@email.com",
        role: "aluno",
        status: "ativo",
        turmas: [TURMA_ID],
      }),
    });

    const result = await updateStudent(ADMIN_ID, STUDENT_ID, {
      name: "Ana Atualizada",
      email: "ana.nova@email.com",
      password: "Nova@123",
      status: "ativo",
      turmaId: TURMA_ID,
    });

    expect(bcrypt.hash).toHaveBeenCalledWith("Nova@123", 10);
    expect(AlunoTurma.updateMany).toHaveBeenCalledWith(
      { aluno: STUDENT_ID, status: "ativa" },
      expect.objectContaining({ status: "inativa" })
    );
    expect(AlunoTurma.findOneAndUpdate).toHaveBeenCalledWith(
      { aluno: STUDENT_ID, turma: TURMA_ID },
      { aluno: STUDENT_ID, turma: TURMA_ID, status: "ativa", removedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    expect(Turma.updateMany).toHaveBeenCalledWith({ alunos: STUDENT_ID }, { $pull: { alunos: STUDENT_ID } });
    expect(Turma.updateOne).toHaveBeenCalledWith({ _id: TURMA_ID }, { $addToSet: { alunos: STUDENT_ID } });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      STUDENT_ID,
      expect.objectContaining({
        email: "ana.nova@email.com",
        name: "Ana Atualizada",
        passwordHash: "nova-hash",
        status: "ativo",
        turmas: [TURMA_ID],
      }),
      { new: true }
    );
    expect(result).toMatchObject({
      email: "ana.nova@email.com",
      name: "Ana Atualizada",
      turmas: [TURMA_ID],
    });
  });
});
