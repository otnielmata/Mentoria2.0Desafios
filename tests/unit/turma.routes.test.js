jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());
jest.mock("../../src/controllers/turma.controller", () => ({
  create: jest.fn(),
}));

const authMiddleware = require("../../src/middlewares/auth.middleware");
const turmaController = require("../../src/controllers/turma.controller");
const turmaRoutes = require("../../src/routes/turma.routes");

describe("turma.routes", () => {
  it("protege POST /turmas com autenticação antes do controller", () => {
    const postTurmasLayer = turmaRoutes.stack.find(
      (layer) => layer.route && layer.route.path === "/turmas" && layer.route.methods.post
    );

    expect(postTurmasLayer).toBeDefined();
    expect(postTurmasLayer.route.stack.map((layer) => layer.handle)).toEqual([
      authMiddleware,
      turmaController.create,
    ]);
  });
});
