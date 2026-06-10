const mockRouter = {
  post: jest.fn(),
};

jest.mock("express", () => ({
  Router: jest.fn(() => mockRouter),
}));

jest.mock("../../src/controllers/pilar.controller", () => ({
  create: jest.fn(),
}));

jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());

const express = require("express");
const pilarController = require("../../src/controllers/pilar.controller");
const authMiddleware = require("../../src/middlewares/auth.middleware");
const pilarRoutes = require("../../src/routes/pilar.routes");

describe("pilar.routes", () => {
  it("registra POST /pilares protegido por autenticação", () => {
    expect(express.Router).toHaveBeenCalled();
    expect(mockRouter.post).toHaveBeenCalledWith("/pilares", authMiddleware, pilarController.create);
    expect(pilarRoutes).toBe(mockRouter);
  });
});
