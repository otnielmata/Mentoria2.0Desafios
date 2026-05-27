jest.mock("../../src/services/profile.service", () => ({
  updateAuthenticatedUser: jest.fn(),
}));

const profileService = require("../../src/services/profile.service");
const profileController = require("../../src/controllers/profile.controller");

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("profile.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("atualiza o perfil do usuário autenticado", async () => {
    const req = {
      user: { id: "user-1" },
      body: { name: "Nome Novo" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const updatedUser = { id: "user-1", name: "Nome Novo", email: "user@email.com" };
    profileService.updateAuthenticatedUser.mockResolvedValue(updatedUser);

    await profileController.updateMe(req, res, next);

    expect(profileService.updateAuthenticatedUser).toHaveBeenCalledWith("user-1", { name: "Nome Novo" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: updatedUser });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros da regra de negócio para o middleware de erro", async () => {
    const req = {
      user: { id: "user-1" },
      body: { role: "admin" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Campos protegidos não podem ser alterados.");
    profileService.updateAuthenticatedUser.mockRejectedValue(error);

    await profileController.updateMe(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
