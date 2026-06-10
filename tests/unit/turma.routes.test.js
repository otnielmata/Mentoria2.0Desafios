const mockRouter = {
  patch: jest.fn(),
};

jest.mock("express", () => ({
  Router: jest.fn(() => mockRouter),
}));

jest.mock("../../src/controllers/turma.controller", () => ({
  close: jest.fn(),
}));

jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());

const express = require("express");
const turmaController = require("../../src/controllers/turma.controller");
const authMiddleware = require("../../src/middlewares/auth.middleware");
const turmaRoutes = require("../../src/routes/turma.routes");

describe("turma.routes", () => {
  it("registra PATCH /turmas/:id/encerrar protegido por autenticação", () => {
    expect(express.Router).toHaveBeenCalled();
    expect(mockRouter.patch).toHaveBeenCalledWith("/turmas/:id/encerrar", authMiddleware, turmaController.close);
    expect(turmaRoutes).toBe(mockRouter);
  });
});
