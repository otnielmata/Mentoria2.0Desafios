jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());
jest.mock("../../src/controllers/student.controller", () => ({
  list: jest.fn(),
}));

const authMiddleware = require("../../src/middlewares/auth.middleware");
const studentController = require("../../src/controllers/student.controller");
const studentRoutes = require("../../src/routes/student.routes");

describe("student.routes", () => {
  it("protege GET /alunos com autenticação antes do controller", () => {
    const getAlunosLayer = studentRoutes.stack.find(
      (layer) => layer.route && layer.route.path === "/alunos" && layer.route.methods.get
    );

    expect(getAlunosLayer).toBeDefined();
    expect(getAlunosLayer.route.stack.map((layer) => layer.handle)).toEqual([
      authMiddleware,
      studentController.list,
    ]);
  });
});
