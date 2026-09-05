jest.mock("../../src/services/token.service", () => ({
  verifyToken: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const { verifyToken } = require("../../src/services/token.service");
const User = require("../../src/models/user.model");
const authMiddleware = require("../../src/middlewares/auth.middleware");

function createResponse() {
  return {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
}

describe("auth.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 401 somente quando o token é inválido", async () => {
    verifyToken.mockImplementation(() => {
      throw new Error("invalid token");
    });
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware({ headers: { authorization: "Bearer token" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Token inválido ou expirado.", code: "TOKEN_INVALID" });
    expect(User.findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha falhas do banco para o middleware de erro", async () => {
    verifyToken.mockReturnValue({ sub: "user-1" });
    const databaseError = new Error("database unavailable");
    User.findById.mockImplementation(() => {
      throw databaseError;
    });
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware({ headers: { authorization: "Bearer token" } }, res, next);

    expect(next).toHaveBeenCalledWith(databaseError);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("revoga a sessão quando o usuário fica inativo", async () => {
    verifyToken.mockReturnValue({ sub: "user-1", authVersion: 0 });
    User.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "user-1", status: "inativo", authVersion: 0 }),
    });
    const res = createResponse();
    const next = jest.fn();

    await authMiddleware({ headers: { authorization: "Bearer token" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Usuário inativo. Faça login com um usuário ativo.",
      code: "INACTIVE_USER",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
