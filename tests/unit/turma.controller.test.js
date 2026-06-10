jest.mock("../../src/services/turma.service", () => ({
  enrollStudent: jest.fn(),
}));

const turmaService = require("../../src/services/turma.service");
const turmaController = require("../../src/controllers/turma.controller");

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("turma.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde com a matrícula criada pelo serviço", async () => {
    const req = {
      user: { id: "admin-1" },
      params: { turmaId: "6814f12ab3f34872f7558f49" },
      body: { studentId: "6814f12ab3f34872f7558f50" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const matricula = {
      turmaId: req.params.turmaId,
      studentId: req.body.studentId,
      status: "ativa",
    };
    turmaService.enrollStudent.mockResolvedValue(matricula);

    await turmaController.enrollStudent(req, res, next);

    expect(turmaService.enrollStudent).toHaveBeenCalledWith("admin-1", req.params.turmaId, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ matricula });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros do serviço para o middleware de erro", async () => {
    const req = {
      user: { id: "admin-1" },
      params: { turmaId: "6814f12ab3f34872f7558f49" },
      body: { studentId: "6814f12ab3f34872f7558f50" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Aluno já matriculado nesta turma.");
    turmaService.enrollStudent.mockRejectedValue(error);

    await turmaController.enrollStudent(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
