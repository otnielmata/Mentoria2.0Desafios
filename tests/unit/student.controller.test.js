jest.mock("../../src/services/student.service", () => ({
  getStudentById: jest.fn(),
}));

const studentService = require("../../src/services/student.service");
const studentController = require("../../src/controllers/student.controller");

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("student.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("consulta detalhes do aluno usando usuário autenticado e id da rota", async () => {
    const req = {
      user: { id: "admin-1" },
      params: { id: "student-1" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const student = {
      id: "student-1",
      name: "Maria Silva",
      email: "maria@email.com",
      role: "aluno",
      status: "ativo",
    };
    studentService.getStudentById.mockResolvedValue(student);

    await studentController.show(req, res, next);

    expect(studentService.getStudentById).toHaveBeenCalledWith("admin-1", "student-1");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ student });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros da regra de negócio para o middleware de erro", async () => {
    const req = {
      user: { id: "student-actor" },
      params: { id: "student-1" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Apenas professor ou admin pode visualizar alunos.");
    studentService.getStudentById.mockRejectedValue(error);

    await studentController.show(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
