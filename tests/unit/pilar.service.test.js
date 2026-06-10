jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

jest.mock("../../src/models/pilar.model", () => ({
  findOne: jest.fn(),
}));

const Pilar = require("../../src/models/pilar.model");
const User = require("../../src/models/user.model");
const { getPilarById } = require("../../src/services/pilar.service");

const PILAR_ID = "6814f12ab3f34872f7558f49";
const DESAFIO_ID = "6814f12ab3f34872f7558f50";

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
    _id: { toString: () => PILAR_ID },
    name: "Clareza",
    description: "Pilar de clareza",
    status: "ativo",
    desafios: [
      {
        _id: { toString: () => DESAFIO_ID },
        title: "Diagnosticar ponto de partida",
        description: "Mapear o estado atual antes da execução.",
        status: "ativo",
      },
    ],
    ...overrides,
  };
}

function mockFindOneLean(pilar) {
  const chain = {
    lean: jest.fn().mockResolvedValue(pilar),
  };

  Pilar.findOne.mockReturnValue(chain);
  return chain;
}

describe("pilar.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("visualiza pilar ativo com descrição e desafios para aluno autenticado", async () => {
    const findChain = mockFindOneLean(makePilar());
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    const result = await getPilarById("student-1", PILAR_ID);

    expect(User.findById).toHaveBeenCalledWith("student-1");
    expect(Pilar.findOne).toHaveBeenCalledWith({ _id: PILAR_ID, status: "ativo" });
    expect(findChain.lean).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: PILAR_ID,
      name: "Clareza",
      description: "Pilar de clareza",
      status: "ativo",
      desafios: [
        {
          id: DESAFIO_ID,
          title: "Diagnosticar ponto de partida",
          description: "Mapear o estado atual antes da execução.",
          status: "ativo",
        },
      ],
    });
  });

  it("retorna 404 para aluno quando pilar não é acessível", async () => {
    mockFindOneLean(null);
    User.findById.mockResolvedValue(makeUser({ role: "aluno" }));

    await expect(getPilarById("student-1", PILAR_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Pilar não encontrado.",
    });

    expect(Pilar.findOne).toHaveBeenCalledWith({ _id: PILAR_ID, status: "ativo" });
  });

  it("permite que professor visualize pilar inativo", async () => {
    mockFindOneLean(
      makePilar({
        status: "inativo",
        desafios: [],
      })
    );
    User.findById.mockResolvedValue(makeUser({ role: "professor" }));

    const result = await getPilarById("teacher-1", PILAR_ID);

    expect(Pilar.findOne).toHaveBeenCalledWith({ _id: PILAR_ID });
    expect(result).toEqual({
      id: PILAR_ID,
      name: "Clareza",
      description: "Pilar de clareza",
      status: "inativo",
      desafios: [],
    });
  });

  it("permite que admin visualize pilar sem restringir status", async () => {
    mockFindOneLean(makePilar({ status: "inativo" }));
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await getPilarById("admin-1", PILAR_ID);

    expect(Pilar.findOne).toHaveBeenCalledWith({ _id: PILAR_ID });
  });

  it("retorna 404 quando o pilar não existe", async () => {
    mockFindOneLean(null);
    User.findById.mockResolvedValue(makeUser({ role: "admin" }));

    await expect(getPilarById("admin-1", PILAR_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Pilar não encontrado.",
    });
  });

  it("retorna 404 para id de pilar inválido sem consultar banco", async () => {
    await expect(getPilarById("student-1", "id-invalido")).rejects.toMatchObject({
      statusCode: 404,
      message: "Pilar não encontrado.",
    });

    expect(User.findById).not.toHaveBeenCalled();
    expect(Pilar.findOne).not.toHaveBeenCalled();
  });

  it("retorna 404 quando usuário autenticado não existe", async () => {
    User.findById.mockResolvedValue(null);

    await expect(getPilarById("missing-user", PILAR_ID)).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });

    expect(Pilar.findOne).not.toHaveBeenCalled();
  });
});
