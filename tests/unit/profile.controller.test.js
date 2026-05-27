jest.mock("../../src/services/profile.service", () => ({
  getAuthenticatedUser: jest.fn(),
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

  it("consulta o perfil do usuário autenticado", async () => {
    const req = {
      user: { id: "user-1" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const profileUser = {
      id: "user-1",
      name: "Nome",
      email: "user@email.com",
      role: "student",
      status: "active",
    };
    profileService.getAuthenticatedUser.mockResolvedValue(profileUser);

    await profileController.getMe(req, res, next);

    expect(profileService.getAuthenticatedUser).toHaveBeenCalledWith("user-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: profileUser });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros da consulta de perfil para o middleware de erro", async () => {
    const req = {
      user: { id: "user-1" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Usuário autenticado não encontrado.");
    profileService.getAuthenticatedUser.mockRejectedValue(error);

    await profileController.getMe(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("atualiza o perfil do usuário autenticado", async () => {
    const req = {
      user: { id: "user-1" },
      body: { name: "Nome Novo" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const updatedUser = {
      id: "user-1",
      name: "Nome Novo",
      email: "user@email.com",
      role: "student",
      status: "active",
    };
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
