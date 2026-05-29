jest.mock("../../src/services/student.service", () => ({
  listStudents: jest.fn(),
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

  it("lista alunos usando usuário autenticado e query params", async () => {
    const req = {
      user: { id: "admin-1" },
      query: { page: "1", limit: "10" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const result = {
      students: [{ id: "student-1", name: "Maria Silva", email: "maria@email.com" }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    studentService.listStudents.mockResolvedValue(result);

    await studentController.list(req, res, next);

    expect(studentService.listStudents).toHaveBeenCalledWith("admin-1", req.query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros da regra de negócio para o middleware de erro", async () => {
    const req = {
      user: { id: "student-actor" },
      query: {},
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Apenas professor ou admin pode listar alunos.");
    studentService.listStudents.mockRejectedValue(error);

    await studentController.list(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
