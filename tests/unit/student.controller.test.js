jest.mock("../../src/services/student.service", () => ({
  createStudent: jest.fn(),
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

  it("cadastra aluno usando o usuário autenticado", async () => {
    const req = {
      user: { id: "admin-1" },
      body: { name: "Aluno Novo", email: "aluno@email.com", password: "123456" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const student = {
      id: "student-1",
      name: "Aluno Novo",
      email: "aluno@email.com",
      role: "aluno",
      status: "ativo",
    };
    studentService.createStudent.mockResolvedValue(student);

    await studentController.create(req, res, next);

    expect(studentService.createStudent).toHaveBeenCalledWith("admin-1", req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ student });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros da regra de negócio para o middleware de erro", async () => {
    const req = {
      user: { id: "student-actor" },
      body: { name: "Aluno Novo" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Apenas professor ou admin pode cadastrar alunos.");
    studentService.createStudent.mockRejectedValue(error);

    await studentController.create(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
