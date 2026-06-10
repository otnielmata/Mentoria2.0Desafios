const mockRouter = {
  delete: jest.fn(),
};

jest.mock("express", () => ({
  Router: jest.fn(() => mockRouter),
}));

jest.mock("../../src/controllers/turma.controller", () => ({
  removeStudent: jest.fn(),
}));

jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());

const express = require("express");
const turmaController = require("../../src/controllers/turma.controller");
const authMiddleware = require("../../src/middlewares/auth.middleware");
const turmaRoutes = require("../../src/routes/turma.routes");

describe("turma.routes", () => {
  it("registra DELETE /turmas/:turmaId/alunos/:alunoId protegido por autenticação", () => {
    expect(express.Router).toHaveBeenCalled();
    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/turmas/:turmaId/alunos/:alunoId",
      authMiddleware,
      turmaController.removeStudent
    );
    expect(turmaRoutes).toBe(mockRouter);
  });
});
