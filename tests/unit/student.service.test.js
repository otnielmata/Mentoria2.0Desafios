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
  findOne: jest.fn(),
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

jest.mock("../../src/services/plano-estudo.service", () => {
  const actual = jest.requireActual("../../src/services/plano-estudo.service");
  return {
    ...actual,
    getChecklistSummaryFromFilters: jest.fn(),
  };
});

const AlunoTurma = require("../../src/models/aluno-turma.model");
const bcrypt = require("bcryptjs");
const Pontuacao = require("../../src/models/pontuacao.model");
const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const planoEstudoService = require("../../src/services/plano-estudo.service");
const { createStudent, disableStudent, getStudent, importStudentsFromCsv, listStudents, updateStudent } = require("../../src/services/student.service");

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
    planoEstudoService.getChecklistSummaryFromFilters.mockResolvedValue({ totalPontos: 0, totalTarefas: 0, tarefasConcluidas: 0, diasComCheck: 0, semanas: [] });
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
      discordJoined: true,
      turmas: [],
    });

    const result = await createStudent(ADMIN_ID, {
      email: "ANA@EMAIL.COM",
      name: "Ana",
      password: "123456",
      role: "aluno",
      status: "inativo",
      discordJoined: true,
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@email.com",
        name: "Ana",
        passwordHash: "hash-seguro",
        role: "aluno",
        status: "inativo",
        discordJoined: true,
      })
    );
    expect(result).toEqual({
      discordJoined: true,
      email: "ana@email.com",
      entrouNoDiscord: true,
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
    const chain = mockUserFindChain([
      { _id: STUDENT_ID, name: "Ana", email: "ana@email.com", role: "aluno", status: "ativo", discordJoined: true, turmas: [TURMA_ID] },
    ]);

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
    expect(result.alunos[0]).toMatchObject({ discordJoined: true, entrouNoDiscord: true });
    expect(result.alunos[0]).not.toHaveProperty("passwordHash");
  });

  it("retorna aluno com resumo de pontuação sem campos sensíveis", async () => {
    planoEstudoService.getChecklistSummaryFromFilters.mockResolvedValue({ totalPontos: 2, totalTarefas: 0, tarefasConcluidas: 0, diasComCheck: 0, semanas: [] });
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

    expect(result.pontuacao).toEqual({ totalPontos: 32, desafiosAprovados: 2 });
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
        discordJoined: true,
        turmas: [TURMA_ID],
      }),
    });

    const result = await updateStudent(ADMIN_ID, STUDENT_ID, {
      name: "Ana Atualizada",
      email: "ana.nova@email.com",
      password: "Nova@123",
      status: "ativo",
      turmaId: TURMA_ID,
      discordJoined: true,
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
        discordJoined: true,
        turmas: [TURMA_ID],
      }),
      { new: true }
    );
    expect(result).toMatchObject({
      email: "ana.nova@email.com",
      name: "Ana Atualizada",
      turmas: [TURMA_ID],
      discordJoined: true,
      entrouNoDiscord: true,
    });
  });

  it("importa alunos em lote por CSV vinculando turma existente", async () => {
    bcrypt.hash.mockResolvedValue("hash-csv");
    Turma.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: TURMA_ID, name: "Turma 1", code: "T1" }),
    });
    User.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    User.create.mockResolvedValue({
      _id: STUDENT_ID,
      id: STUDENT_ID,
      name: "Aluno CSV",
      email: "aluno.csv@email.com",
      role: "aluno",
      status: "ativo",
      discordJoined: false,
      turmas: [TURMA_ID],
    });

    const result = await importStudentsFromCsv(ADMIN_ID, "Nome;E-mail;Senha Inicial;Turma\nAluno CSV;aluno.csv@email.com;Teste@123;Turma 1");

    expect(Turma.findOne).toHaveBeenCalledWith({
      $or: [{ name: /^Turma 1$/i }, { code: /^Turma 1$/i }],
    });
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "aluno.csv@email.com",
        name: "Aluno CSV",
        passwordHash: "hash-csv",
        role: "aluno",
        status: "ativo",
        discordJoined: false,
        turmas: [TURMA_ID],
      })
    );
    expect(AlunoTurma.create).toHaveBeenCalledWith({ aluno: STUDENT_ID, turma: TURMA_ID, status: "ativa" });
    expect(Turma.updateOne).toHaveBeenCalledWith({ _id: TURMA_ID }, { $addToSet: { alunos: STUDENT_ID } });
    expect(result).toMatchObject({
      total: 1,
      importados: 1,
      falhas: 0,
      alunos: [expect.objectContaining({ email: "aluno.csv@email.com", discordJoined: false })],
    });
  });
});
