const bcrypt = require("bcryptjs");
const User = require("../../src/models/user.model");
const { generateToken } = require("../../src/services/token.service");
const { registerUser } = require("../../src/services/auth.service");

jest.mock("bcryptjs");
jest.mock("../../src/models/user.model");
jest.mock("../../src/services/token.service");

describe("auth.service registerUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates user with hashed password and active status", async () => {
    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-password");
    generateToken.mockReturnValue("jwt-token");
    User.create.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@email.com",
      status: "active",
    });

    const result = await registerUser({
      name: "Ana",
      email: "ana@email.com",
      password: "123456",
    });

    expect(User.create).toHaveBeenCalledWith({
      name: "Ana",
      email: "ana@email.com",
      passwordHash: "hashed-password",
      status: "active",
    });
    expect(result.user.id).toBe("user-1");
    expect(result.user.status).toBe("active");
  });

  it("rejects duplicate email", async () => {
    User.findOne.mockResolvedValue({ id: "existing-user" });

    await expect(
      registerUser({
        name: "Ana",
        email: "ana@email.com",
        password: "123456",
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "EMAIL_ALREADY_IN_USE",
      message: "E-mail já está em uso.",
    });
  });

  it("returns standardized validation details for invalid payload", async () => {
    await expect(
      registerUser({
        name: "",
        email: "email-invalido",
        password: "123",
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Dados de validação inválidos.",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "name" }),
        expect.objectContaining({ field: "email" }),
        expect.objectContaining({ field: "password" }),
      ]),
    });
  });
});
