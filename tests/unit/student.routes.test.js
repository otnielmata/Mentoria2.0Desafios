jest.mock("../../src/middlewares/auth.middleware", () => jest.fn());
jest.mock("../../src/controllers/student.controller", () => ({
  create: jest.fn(),
}));

const authMiddleware = require("../../src/middlewares/auth.middleware");
const studentController = require("../../src/controllers/student.controller");
const studentRoutes = require("../../src/routes/student.routes");

describe("student.routes", () => {
  it("protege POST /alunos com autenticação antes do controller", () => {
    const postAlunosLayer = studentRoutes.stack.find(
      (layer) => layer.route && layer.route.path === "/alunos" && layer.route.methods.post
    );

    expect(postAlunosLayer).toBeDefined();
    expect(postAlunosLayer.route.stack.map((layer) => layer.handle)).toEqual([
      authMiddleware,
      studentController.create,
    ]);
  });
});
