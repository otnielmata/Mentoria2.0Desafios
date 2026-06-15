jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const User = require("../../src/models/user.model");
const { authorizeRoles } = require("../../src/middlewares/authorization.middleware");

function createResponse() {
  return {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
}

describe("authorization.middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("bloqueia rota protegida quando não existe usuário autenticado", async () => {
    const middleware = authorizeRoles(["admin"]);
    const res = createResponse();
    const next = jest.fn();

    await middleware({}, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Usuário não autenticado." });
    expect(next).not.toHaveBeenCalled();
  });

  it("bloqueia aluno tentando acessar rota administrativa", async () => {
    const middleware = authorizeRoles(["professor", "admin"]);
    const res = createResponse();
    const next = jest.fn();

    await middleware({ user: { id: "aluno-1", role: "aluno" } }, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Acesso não autorizado para este perfil." });
    expect(next).not.toHaveBeenCalled();
  });

  it("libera perfil autorizado usando role do token", async () => {
    const middleware = authorizeRoles(["professor", "admin"]);
    const res = createResponse();
    const next = jest.fn();

    await middleware({ user: { id: "admin-1", role: "admin" } }, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it("consulta o usuário no banco quando o token não carrega role", async () => {
    User.findById.mockResolvedValue({ role: "professor", status: "ativo" });
    const middleware = authorizeRoles(["professor", "admin"]);
    const req = { user: { id: "professor-1" } };
    const res = createResponse();
    const next = jest.fn();

    await middleware(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("professor-1");
    expect(req.user).toMatchObject({ role: "professor", status: "ativo" });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
