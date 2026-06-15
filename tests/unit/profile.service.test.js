jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const User = require("../../src/models/user.model");
const { getMe, updateMe } = require("../../src/services/profile.service");

const USER_ID = "6814f12ab3f34872f7558f41";
const TURMA_ID = "6814f12ab3f34872f7558f42";

function mockFindById(user) {
  User.findById.mockReturnValue({
    populate: jest.fn(() => ({
      lean: jest.fn().mockResolvedValue(user),
    })),
    lean: jest.fn().mockResolvedValue(user),
  });
}

describe("profile.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna perfil com turma sem expor senha ou hash", async () => {
    mockFindById({
      _id: USER_ID,
      name: "Ana",
      email: "ana@email.com",
      role: "aluno",
      status: "ativo",
      passwordHash: "hash",
      turmas: [{ _id: TURMA_ID, name: "Turma 1", code: "T1", status: "ativa" }],
    });

    const result = await getMe(USER_ID);

    expect(result).toEqual({
      id: USER_ID,
      name: "Ana",
      email: "ana@email.com",
      role: "aluno",
      status: "ativo",
      turmas: [{ id: TURMA_ID, name: "Turma 1", code: "T1", status: "ativa" }],
    });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("permite atualizar nome e senha usando senha atual", async () => {
    mockFindById({
      _id: USER_ID,
      name: "Ana",
      email: "ana@email.com",
      role: "aluno",
      status: "ativo",
      passwordHash: "hash-atual",
      turmas: [],
    });
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("novo-hash");
    User.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: USER_ID,
        name: "Ana Silva",
        email: "ana@email.com",
        role: "aluno",
        status: "ativo",
        turmas: [],
      }),
    });

    const result = await updateMe(USER_ID, {
      name: "Ana Silva",
      currentPassword: "senha-atual",
      newPassword: "nova-senha",
    });

    expect(bcrypt.compare).toHaveBeenCalledWith("senha-atual", "hash-atual");
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      { name: "Ana Silva", passwordHash: "novo-hash" },
      { new: true }
    );
    expect(result.name).toBe("Ana Silva");
  });

  it("bloqueia turma, status e perfil no autoatendimento", async () => {
    mockFindById({
      _id: USER_ID,
      name: "Ana",
      email: "ana@email.com",
      role: "aluno",
      status: "ativo",
      passwordHash: "hash-atual",
      turmas: [],
    });

    await expect(updateMe(USER_ID, { status: "inativo" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Campo status não pode ser alterado neste endpoint.",
    });
    await expect(updateMe(USER_ID, { turmas: [TURMA_ID] })).rejects.toMatchObject({
      statusCode: 400,
      message: "Campo turmas não pode ser alterado neste endpoint.",
    });
    await expect(updateMe(USER_ID, { role: "professor" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Campo role não pode ser alterado neste endpoint.",
    });
  });

  it("exige senha atual válida para trocar senha", async () => {
    mockFindById({
      _id: USER_ID,
      name: "Ana",
      email: "ana@email.com",
      role: "aluno",
      status: "ativo",
      passwordHash: "hash-atual",
      turmas: [],
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(updateMe(USER_ID, { currentPassword: "errada", newPassword: "nova-senha" })).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CURRENT_PASSWORD",
    });
  });
});
