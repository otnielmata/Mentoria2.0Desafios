jest.mock("bcryptjs");
jest.mock("../../src/models/user.model");
jest.mock("../../src/services/audit.service");
jest.mock("../../src/services/token.service");

const bcrypt = require("bcryptjs");
const User = require("../../src/models/user.model");
const { logInvalidLoginAttempt } = require("../../src/services/audit.service");
const { registerUser, loginUser } = require("../../src/services/auth.service");
const { generateToken } = require("../../src/services/token.service");

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registra usuário com e-mail normalizado, senha com hash e status ativo", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-password");
    generateToken.mockReturnValue("jwt-token");
    User.create.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@email.com",
      role: "aluno",
      status: "ativo",
    });

    const result = await registerUser({
      name: " Ana ",
      email: "ANA@EMAIL.COM",
      password: "123456",
    });

    expect(User.create).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@email.com",
      passwordHash: "hashed-password",
      role: "aluno",
      status: "ativo",
    });
    expect(result.user).toEqual({
      id: "user-1",
      name: "Ana",
      email: "ana@email.com",
      role: "aluno",
      status: "ativo",
    });
  });

  it("retorna detalhes padronizados para payload inválido no registro", async () => {
    await expect(registerUser({ name: "", email: "email", password: "123" })).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "password" }),
      ]),
    });
  });

  it("bloqueia login de usuário inativo e registra auditoria sem revelar o motivo", async () => {
    User.findOne.mockResolvedValue({
      id: "user-2",
      email: "aluno@email.com",
      status: "inativo",
      passwordHash: "hashed-password",
    });

    await expect(
      loginUser({
        email: "ALUNO@EMAIL.COM",
        password: "123456",
        metadata: { ip: "127.0.0.1", userAgent: "jest" },
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Credenciais inválidas.",
    });

    expect(logInvalidLoginAttempt).toHaveBeenCalledWith({
      email: "aluno@email.com",
      reason: "inactive_user",
      ip: "127.0.0.1",
      userAgent: "jest",
    });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});
