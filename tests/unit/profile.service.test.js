jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

const User = require("../../src/models/user.model");
const { getAuthenticatedUser, updateAuthenticatedUser } = require("../../src/services/profile.service");

function makeUser(overrides = {}) {
  const user = {
    id: "user-1",
    name: "Nome Antigo",
    email: "antigo@email.com",
    role: "student",
    status: "active",
    passwordHash: "hash-secreto",
    save: jest.fn(function save() {
      return Promise.resolve(this);
    }),
    ...overrides,
  };

  return user;
}

describe("profile.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna o perfil do usuário autenticado sem campos sensíveis", async () => {
    const user = makeUser({
      turmas: ["turma-1", "turma-2"],
    });
    User.findById.mockResolvedValue(user);

    const result = await getAuthenticatedUser("user-1");

    expect(User.findById).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({
      id: "user-1",
      name: "Nome Antigo",
      email: "antigo@email.com",
      role: "student",
      status: "active",
      turmas: ["turma-1", "turma-2"],
    });
    expect(result.password).toBeUndefined();
    expect(result.passwordHash).toBeUndefined();
  });

  it("omite turmas quando o usuário não possui vínculos", async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);

    const result = await getAuthenticatedUser("user-1");

    expect(result).toEqual({
      id: "user-1",
      name: "Nome Antigo",
      email: "antigo@email.com",
      role: "student",
      status: "active",
    });
  });

  it("aplica valores padrão de role e status para usuários antigos", async () => {
    const user = makeUser({
      role: undefined,
      status: undefined,
    });
    User.findById.mockResolvedValue(user);

    const result = await getAuthenticatedUser("user-1");

    expect(result.role).toBe("student");
    expect(result.status).toBe("active");
  });

  it("retorna erro ao consultar perfil de usuário autenticado inexistente", async () => {
    User.findById.mockResolvedValue(null);

    await expect(getAuthenticatedUser("user-1")).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });
  });

  it("atualiza nome e e-mail permitidos e retorna usuário sem campos sensíveis", async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    User.findOne.mockResolvedValue(null);

    const result = await updateAuthenticatedUser("user-1", {
      name: "  Nome Novo  ",
      email: " NOVO@EMAIL.COM ",
    });

    expect(User.findById).toHaveBeenCalledWith("user-1");
    expect(User.findOne).toHaveBeenCalledWith({ email: "novo@email.com" });
    expect(user.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: "user-1",
      name: "Nome Novo",
      email: "novo@email.com",
      role: "student",
      status: "active",
    });
    expect(result.password).toBeUndefined();
    expect(result.passwordHash).toBeUndefined();
  });

  it("não consulta duplicidade quando e-mail normalizado não muda", async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);

    const result = await updateAuthenticatedUser("user-1", {
      email: " ANTIGO@EMAIL.COM ",
    });

    expect(User.findOne).not.toHaveBeenCalled();
    expect(result.email).toBe("antigo@email.com");
  });

  it("rejeita role e status enviados pelo próprio usuário", async () => {
    await expect(
      updateAuthenticatedUser("user-1", {
        name: "Nome Novo",
        role: "admin",
        status: "inactive",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Campos protegidos não podem ser alterados: role, status.",
    });

    expect(User.findById).not.toHaveBeenCalled();
  });

  it("rejeita alteração para e-mail já usado por outro usuário", async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    User.findOne.mockResolvedValue(makeUser({ id: "user-2", email: "novo@email.com" }));

    await expect(
      updateAuthenticatedUser("user-1", {
        email: "novo@email.com",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "E-mail já está em uso.",
    });

    expect(user.save).not.toHaveBeenCalled();
  });

  it("rejeita atualização sem campos editáveis", async () => {
    await expect(updateAuthenticatedUser("user-1", { nickname: "apelido" })).rejects.toMatchObject({
      statusCode: 400,
      message: "Informe pelo menos um campo editável: name, email.",
    });

    expect(User.findById).not.toHaveBeenCalled();
  });

  it("rejeita corpo de requisição que não é objeto", async () => {
    await expect(updateAuthenticatedUser("user-1", null)).rejects.toMatchObject({
      statusCode: 400,
      message: "Corpo da requisição deve ser um objeto JSON.",
    });

    expect(User.findById).not.toHaveBeenCalled();
  });

  it("retorna erro quando usuário autenticado não existe mais", async () => {
    User.findById.mockResolvedValue(null);

    await expect(updateAuthenticatedUser("user-1", { name: "Nome Novo" })).rejects.toMatchObject({
      statusCode: 404,
      message: "Usuário autenticado não encontrado.",
    });
  });

  it("converte erro de índice único do banco em conflito de e-mail", async () => {
    const user = makeUser({
      save: jest.fn().mockRejectedValue({ code: 11000 }),
    });
    User.findById.mockResolvedValue(user);
    User.findOne.mockResolvedValue(null);

    await expect(updateAuthenticatedUser("user-1", { email: "novo@email.com" })).rejects.toMatchObject({
      statusCode: 409,
      message: "E-mail já está em uso.",
    });
  });
});
