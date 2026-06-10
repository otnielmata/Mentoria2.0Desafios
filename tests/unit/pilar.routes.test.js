jest.mock("express", () => ({
  Router: jest.fn(),
}));

jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());
jest.mock("../../src/controllers/pilar.controller", () => ({
  show: jest.fn(),
}));

const express = require("express");
const authMiddleware = require("../../src/middlewares/auth.middleware");
const pilarController = require("../../src/controllers/pilar.controller");

describe("pilar.routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registra rota GET /pilares/:id protegida por autenticação", () => {
    const router = {
      get: jest.fn(),
    };

    express.Router.mockReturnValue(router);

    require("../../src/routes/pilar.routes");

    expect(router.get).toHaveBeenCalledWith("/pilares/:id", authMiddleware, pilarController.show);
  });
});
