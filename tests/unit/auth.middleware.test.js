const authMiddleware = require("../../src/middlewares/auth.middleware");
const tokenService = require("../../src/services/token.service");

jest.mock("../../src/services/token.service");

describe("auth.middleware", () => {
  function buildResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks requests without bearer token", () => {
    const req = { headers: {} };
    const res = buildResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Token não informado." });
    expect(next).not.toHaveBeenCalled();
  });

  it("blocks requests with invalid token", () => {
    tokenService.verifyToken.mockImplementation(() => {
      throw new Error("invalid token");
    });
    const req = { headers: { authorization: "Bearer invalid-token" } };
    const res = buildResponse();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Token inválido ou expirado." });
    expect(next).not.toHaveBeenCalled();
  });

  it("sets req.user and allows requests with valid token", () => {
    tokenService.verifyToken.mockReturnValue({
      sub: "user-1",
      email: "user@email.com",
    });
    const req = { headers: { authorization: "Bearer valid-token" } };
    const next = jest.fn();

    authMiddleware(req, buildResponse(), next);

    expect(req.user).toEqual({ id: "user-1", email: "user@email.com" });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
