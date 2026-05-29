jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

const User = require("../../src/models/user.model");
const { listStudents } = require("../../src/services/student.service");

const turmaId = "507f1f77bcf86cd799439011";

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

function mockFindResult(students) {
  const query = {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(students),
  };

  User.find.mockReturnValue(query);
  return query;
}

describe("student.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lista alunos paginados para admin sem campos sensíveis", async () => {
    const students = [
      makeUser({
        _id: "student-1",
        id: "student-1",
        name: "Maria Silva",
        email: "maria@email.com",
        role: "aluno",
        turmas: [turmaId],
      }),
    ];
    const query = mockFindResult(students);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.countDocuments.mockResolvedValue(12);

    const result = await listStudents("admin-1", { page: "2", limit: "5" });

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(User.find).toHaveBeenCalledWith({ role: "aluno" });
    expect(query.select).toHaveBeenCalledWith("-password -passwordHash");
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.skip).toHaveBeenCalledWith(5);
    expect(query.limit).toHaveBeenCalledWith(5);
    expect(User.countDocuments).toHaveBeenCalledWith({ role: "aluno" });
    expect(result).toEqual({
      students: [
        {
          id: "student-1",
          name: "Maria Silva",
          email: "maria@email.com",
          role: "aluno",
          status: "ativo",
          turmas: [turmaId],
        },
      ],
      pagination: {
        page: 2,
        limit: 5,
        total: 12,
        totalPages: 3,
      },
    });
    expect(result.students[0].password).toBeUndefined();
    expect(result.students[0].passwordHash).toBeUndefined();
  });

  it("aplica filtros por turma, status e texto de busca", async () => {
    mockFindResult([]);
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    User.countDocuments.mockResolvedValue(0);

    await listStudents("teacher-1", {
      turmaId,
      status: "ativo",
      search: "maria.silva+",
    });

    const filters = User.find.mock.calls[0][0];
    expect(filters.role).toBe("aluno");
    expect(filters.status).toBe("ativo");
    expect(filters.turmas).toBe(turmaId);
    expect(filters.$or).toHaveLength(2);
    expect(filters.$or[0].name.test("Maria.Silva+")).toBe(true);
    expect(filters.$or[0].name.test("Maria Silva")).toBe(false);
    expect(filters.$or[1].email.test("maria.silva+@email.com")).toBe(true);
  });

  it("usa paginação padrão quando page e limit não são informados", async () => {
    const query = mockFindResult([]);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.countDocuments.mockResolvedValue(0);

    const result = await listStudents("admin-1", {});

    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it("limita o tamanho máximo da página", async () => {
    const query = mockFindResult([]);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    User.countDocuments.mockResolvedValue(0);

    const result = await listStudents("admin-1", { limit: "500" });

    expect(query.limit).toHaveBeenCalledWith(100);
    expect(result.pagination.limit).toBe(100);
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(listStudents("student-actor", {})).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode listar alunos.",
    });

    expect(User.find).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(listStudents("missing-user", {})).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });
  });

  it("rejeita turma inválida no filtro", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(listStudents("admin-1", { turmaId: "turma-invalida" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Turma inválida para filtro.",
    });

    expect(User.find).not.toHaveBeenCalled();
  });

  it("rejeita paginação inválida", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(listStudents("admin-1", { page: "0" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Parâmetros de paginação inválidos.",
    });
  });
});
