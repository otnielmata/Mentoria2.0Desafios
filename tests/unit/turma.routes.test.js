const mockRouter = {
  post: jest.fn(),
};

jest.mock("express", () => ({
  Router: jest.fn(() => mockRouter),
}));

jest.mock("../../src/controllers/turma.controller", () => ({
  enrollStudent: jest.fn(),
}));

jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());

const express = require("express");
const turmaController = require("../../src/controllers/turma.controller");
const authMiddleware = require("../../src/middlewares/auth.middleware");
const turmaRoutes = require("../../src/routes/turma.routes");

describe("turma.routes", () => {
  it("registra POST /turmas/:turmaId/alunos protegido por autenticação", () => {
    expect(express.Router).toHaveBeenCalled();
    expect(mockRouter.post).toHaveBeenCalledWith(
      "/turmas/:turmaId/alunos",
      authMiddleware,
      turmaController.enrollStudent
    );
    expect(turmaRoutes).toBe(mockRouter);
  });
});
