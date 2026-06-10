jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/turma.model", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

const Turma = require("../../src/models/turma.model");
const User = require("../../src/models/user.model");
const { listTurmas } = require("../../src/services/turma.service");

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
    _id: { toString: () => "turma-1" },
    name: "Turma Frontend",
    status: "ativa",
    ...overrides,
  };
}

function mockFindChain(turmas) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(turmas),
  };

  Turma.find.mockReturnValue(chain);
  return chain;
}

describe("turma.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("permite que admin liste turmas paginadas com totais quando disponíveis", async () => {
    const startDate = new Date("2026-07-01T00:00:00.000Z");
    const endDate = new Date("2026-08-01T00:00:00.000Z");
    const totals = { students: 24, activeStudents: 22 };
    const findChain = mockFindChain([
      makeTurma({
        startDate,
        endDate,
        totals,
      }),
    ]);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.countDocuments.mockResolvedValue(21);

    const result = await listTurmas("admin-1", {});

    expect(User.findById).toHaveBeenCalledWith("admin-1");
    expect(Turma.find).toHaveBeenCalledWith({});
    expect(findChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(findChain.skip).toHaveBeenCalledWith(0);
    expect(findChain.limit).toHaveBeenCalledWith(10);
    expect(Turma.countDocuments).toHaveBeenCalledWith({});
    expect(result).toEqual({
      turmas: [
        {
          id: "turma-1",
          name: "Turma Frontend",
          status: "ativa",
          startDate: "2026-07-01T00:00:00.000Z",
          endDate: "2026-08-01T00:00:00.000Z",
          totals,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 21,
        totalPages: 3,
      },
    });
  });

  it("permite que professor filtre turmas por status e ajuste a paginação", async () => {
    const findChain = mockFindChain([
      makeTurma({
        id: "turma-2",
        name: "Turma Backend",
        status: "encerrada",
      }),
    ]);
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));
    Turma.countDocuments.mockResolvedValue(11);

    const result = await listTurmas("teacher-1", {
      page: "2",
      limit: "5",
      status: " encerrada ",
    });

    expect(Turma.find).toHaveBeenCalledWith({ status: "encerrada" });
    expect(Turma.countDocuments).toHaveBeenCalledWith({ status: "encerrada" });
    expect(findChain.skip).toHaveBeenCalledWith(5);
    expect(findChain.limit).toHaveBeenCalledWith(5);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      total: 11,
      totalPages: 3,
    });
    expect(result.turmas).toEqual([
      {
        id: "turma-2",
        name: "Turma Backend",
        status: "encerrada",
      },
    ]);
  });

  it("limita o tamanho da página ao máximo suportado", async () => {
    const findChain = mockFindChain([]);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));
    Turma.countDocuments.mockResolvedValue(0);

    const result = await listTurmas("admin-1", {
      limit: "500",
    });

    expect(findChain.limit).toHaveBeenCalledWith(100);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 100,
      total: 0,
      totalPages: 0,
    });
  });

  it("rejeita usuário autenticado que não é professor nem admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(listTurmas("student-1", {})).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas professor ou admin pode listar turmas.",
    });

    expect(Turma.find).not.toHaveBeenCalled();
    expect(Turma.countDocuments).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(listTurmas("missing-user", {})).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });

    expect(Turma.find).not.toHaveBeenCalled();
  });

  it("rejeita paginação inválida", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(listTurmas("admin-1", { page: "0" })).rejects.toMatchObject({
      statusCode: 400,
      message: "page deve ser um número inteiro maior que zero.",
    });

    expect(Turma.find).not.toHaveBeenCalled();
  });

  it("rejeita status inválido", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(listTurmas("admin-1", { status: ["ativa"] })).rejects.toMatchObject({
      statusCode: 400,
      message: "status deve ser um texto válido.",
    });

    expect(Turma.find).not.toHaveBeenCalled();
  });
});
