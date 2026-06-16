jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const User = require("../../src/models/user.model");
const {
  createManagedUser,
  listManagedUsers,
  updateManagedUser,
} = require("../../src/services/user-management.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const USER_ID = "6814f12ab3f34872f7558f41";

function mockUserFindChain(records) {
  const lean = jest.fn().mockResolvedValue(records);
  const limit = jest.fn(() => ({ lean }));
  const skip = jest.fn(() => ({ limit }));
  const sort = jest.fn(() => ({ skip }));
  User.find.mockReturnValue({ sort });
  return { sort, skip, limit, lean };
}

describe("user-management.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
    bcrypt.hash.mockResolvedValue("hash-seguro");
  });

  it("cadastra usuário administrador sem expor senha", async () => {
    User.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    User.create.mockResolvedValue({
      _id: USER_ID,
      name: "Gestor",
      email: "gestor@email.com",
      role: "admin",
      status: "ativo",
      passwordHash: "hash-seguro",
      turmas: [],
    });

    const result = await createManagedUser(ADMIN_ID, {
      name: "Gestor",
      email: "GESTOR@EMAIL.COM",
      password: "Teste@123",
      role: "admin",
      status: "ativo",
    });

    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "gestor@email.com",
        name: "Gestor",
        passwordHash: "hash-seguro",
        role: "admin",
        status: "ativo",
      })
    );
    expect(result).toEqual({
      email: "gestor@email.com",
      id: USER_ID,
      name: "Gestor",
      role: "admin",
      status: "ativo",
      turmas: [],
    });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("lista usuários com filtros de perfil, status e busca textual", async () => {
    User.countDocuments.mockResolvedValue(1);
    const chain = mockUserFindChain([
      {
        _id: USER_ID,
        name: "Professor",
        email: "professor@email.com",
        role: "professor",
        status: "ativo",
        passwordHash: "secret",
      },
    ]);

    const result = await listManagedUsers(ADMIN_ID, {
      role: "professor",
      status: "ativo",
      search: "prof",
      page: "2",
      limit: "5",
    });

    expect(User.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        role: "professor",
        status: "ativo",
        $or: expect.any(Array),
      })
    );
    expect(chain.skip).toHaveBeenCalledWith(5);
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(result.pagination).toEqual({ page: 2, limit: 5, total: 1, totalPages: 1 });
    expect(result.users[0]).not.toHaveProperty("passwordHash");
  });

  it("edita perfil, status, e-mail e senha do usuário", async () => {
    User.findById
      .mockResolvedValueOnce({ _id: ADMIN_ID, role: "admin" })
      .mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({
          _id: USER_ID,
          name: "Usuário",
          email: "usuario@email.com",
          role: "aluno",
          status: "ativo",
        }),
      });
    User.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });
    User.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: USER_ID,
        name: "Professor Atualizado",
        email: "professor.novo@email.com",
        role: "professor",
        status: "ativo",
        turmas: [],
      }),
    });

    const result = await updateManagedUser(ADMIN_ID, USER_ID, {
      name: "Professor Atualizado",
      email: "professor.novo@email.com",
      password: "Nova@123",
      role: "professor",
      status: "ativo",
    });

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        email: "professor.novo@email.com",
        name: "Professor Atualizado",
        passwordHash: "hash-seguro",
        role: "professor",
        status: "ativo",
      }),
      { new: true }
    );
    expect(result).toMatchObject({
      email: "professor.novo@email.com",
      name: "Professor Atualizado",
      role: "professor",
      status: "ativo",
    });
  });

  it("bloqueia gestão de perfis para professor", async () => {
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "professor" });

    await expect(listManagedUsers(ADMIN_ID)).rejects.toMatchObject({
      statusCode: 403,
      message: "Apenas administrador pode gerenciar usuários e perfis.",
    });
  });
});
