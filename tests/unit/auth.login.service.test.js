const bcrypt = require("bcryptjs");
const User = require("../../src/models/user.model");
const { generateToken } = require("../../src/services/token.service");
const { logInvalidLoginAttempt } = require("../../src/services/audit.service");
const { loginUser } = require("../../src/services/auth.service");

jest.mock("bcryptjs");
jest.mock("../../src/models/user.model");
jest.mock("../../src/services/token.service");
jest.mock("../../src/services/audit.service");

describe("auth.service loginUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("authenticates active user and returns token", async () => {
    User.findOne.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@email.com",
      passwordHash: "hashed-password",
      status: "active",
    });
    bcrypt.compare.mockResolvedValue(true);
    generateToken.mockReturnValue("jwt-token");

    const result = await loginUser({
      email: "ana@email.com",
      password: "123456",
      metadata: { ip: "127.0.0.1", userAgent: "jest" },
    });

    expect(generateToken).toHaveBeenCalledWith({
      sub: "user-1",
      email: "ana@email.com",
    });
    expect(logInvalidLoginAttempt).not.toHaveBeenCalled();
    expect(result.token).toBe("jwt-token");
  });

  it("rejects login for wrong password with generic message and audits attempt", async () => {
    User.findOne.mockResolvedValue({
      id: "user-1",
      email: "ana@email.com",
      passwordHash: "hashed-password",
      status: "active",
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      loginUser({
        email: "ana@email.com",
        password: "wrong-pass",
        metadata: { ip: "127.0.0.1", userAgent: "jest" },
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Credenciais inválidas.",
    });

    expect(logInvalidLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ana@email.com",
        reason: "invalid_password",
      })
    );
  });

  it("rejects login for nonexistent user and audits attempt", async () => {
    User.findOne.mockResolvedValue(null);

    await expect(
      loginUser({
        email: "notfound@email.com",
        password: "123456",
        metadata: { ip: "127.0.0.1", userAgent: "jest" },
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
    });

    expect(logInvalidLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "notfound@email.com",
        reason: "user_not_found",
      })
    );
  });

  it("rejects inactive user and audits attempt", async () => {
    User.findOne.mockResolvedValue({
      id: "user-2",
      email: "inactive@email.com",
      passwordHash: "hashed-password",
      status: "inactive",
    });

    await expect(
      loginUser({
        email: "inactive@email.com",
        password: "123456",
        metadata: { ip: "127.0.0.1", userAgent: "jest" },
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      code: "INVALID_CREDENTIALS",
      message: "Credenciais inválidas.",
    });

    expect(logInvalidLoginAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "inactive@email.com",
        reason: "inactive_user",
      })
    );
  });
});
