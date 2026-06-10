jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/pilar.model", () => ({
  find: jest.fn(),
}));

const Pilar = require("../../src/models/pilar.model");
const User = require("../../src/models/user.model");
const { listPilares } = require("../../src/services/pilar.service");

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    name: "Aluno",
    email: "aluno@email.com",
    role: "aluno",
    ...overrides,
  };
}

function makePilar(overrides = {}) {
  return {
    _id: { toString: () => "pilar-1" },
    name: "Clareza",
    description: "Pilar de clareza",
    status: "ativo",
    ...overrides,
  };
}

function mockFindChain(pilares) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(pilares),
  };

  Pilar.find.mockReturnValue(chain);
  return chain;
}

describe("pilar.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lista apenas pilares ativos para aluno autenticado", async () => {
    const findChain = mockFindChain([
      makePilar(),
      makePilar({
        _id: { toString: () => "pilar-2" },
        name: "Execução",
        description: undefined,
      }),
    ]);
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    const result = await listPilares("student-1", {});

    expect(User.findById).toHaveBeenCalledWith("student-1");
    expect(Pilar.find).toHaveBeenCalledWith({ status: "ativo" });
    expect(findChain.sort).toHaveBeenCalledWith({ name: 1 });
    expect(result).toEqual([
      {
        id: "pilar-1",
        name: "Clareza",
        description: "Pilar de clareza",
        status: "ativo",
      },
      {
        id: "pilar-2",
        name: "Execução",
        status: "ativo",
      },
    ]);
  });

  it("mantém aluno restrito a pilares ativos mesmo quando status é informado", async () => {
    mockFindChain([]);
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await listPilares("student-1", { status: "inativo" });

    expect(Pilar.find).toHaveBeenCalledWith({ status: "ativo" });
  });

  it("permite que professor filtre pilares por status", async () => {
    const findChain = mockFindChain([
      makePilar({
        id: "pilar-inativo",
        name: "Energia",
        status: "inativo",
      }),
    ]);
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));

    const result = await listPilares("teacher-1", { status: " inativo " });

    expect(Pilar.find).toHaveBeenCalledWith({ status: "inativo" });
    expect(findChain.sort).toHaveBeenCalledWith({ name: 1 });
    expect(result).toEqual([
      {
        id: "pilar-inativo",
        name: "Energia",
        description: "Pilar de clareza",
        status: "inativo",
      },
    ]);
  });

  it("lista pilares ativos por padrão para admin quando filtro não é informado", async () => {
    mockFindChain([]);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await listPilares("admin-1", {});

    expect(Pilar.find).toHaveBeenCalledWith({ status: "ativo" });
  });

  it("rejeita status inválido para professor ou admin", async () => {
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(listPilares("admin-1", { status: ["ativo"] })).rejects.toMatchObject({
      statusCode: 400,
      message: "status deve ser um texto válido.",
    });

    expect(Pilar.find).not.toHaveBeenCalled();
  });

  it("rejeita quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(listPilares("missing-user", {})).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });

    expect(Pilar.find).not.toHaveBeenCalled();
  });
});
