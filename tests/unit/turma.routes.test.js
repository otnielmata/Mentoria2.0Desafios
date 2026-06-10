const mockRouter = {
  get: jest.fn(),
};

jest.mock("express", () => ({
  Router: jest.fn(() => mockRouter),
}));

jest.mock("../../src/controllers/turma.controller", () => ({
  getById: jest.fn(),
}));

jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());

const express = require("express");
const turmaController = require("../../src/controllers/turma.controller");
const authMiddleware = require("../../src/middlewares/auth.middleware");
const turmaRoutes = require("../../src/routes/turma.routes");

describe("turma.routes", () => {
  it("registra GET /turmas/:id protegido por autenticação", () => {
    expect(express.Router).toHaveBeenCalled();
    expect(mockRouter.get).toHaveBeenCalledWith("/turmas/:id", authMiddleware, turmaController.getById);
    expect(turmaRoutes).toBe(mockRouter);
  });
});
