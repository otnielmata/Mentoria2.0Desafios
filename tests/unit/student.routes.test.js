jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());
jest.mock("../../src/controllers/student.controller", () => ({
  show: jest.fn(),
}));

const authMiddleware = require("../../src/middlewares/auth.middleware");
const studentController = require("../../src/controllers/student.controller");
const studentRoutes = require("../../src/routes/student.routes");

describe("student.routes", () => {
  it("protege GET /alunos/:id com autenticação antes do controller", () => {
    const getAlunoLayer = studentRoutes.stack.find(
      (layer) => layer.route && layer.route.path === "/alunos/:id" && layer.route.methods.get
    );

    expect(getAlunoLayer).toBeDefined();
    expect(getAlunoLayer.route.stack.map((layer) => layer.handle)).toEqual([
      authMiddleware,
      studentController.show,
    ]);
  });
});
