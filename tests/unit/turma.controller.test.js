jest.mock("../../src/services/turma.service", () => ({
  createTurma: jest.fn(),
}));

const turmaService = require("../../src/services/turma.service");
const turmaController = require("../../src/controllers/turma.controller");

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe("turma.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cadastra turma usando usuário autenticado", async () => {
    const req = {
      user: { id: "admin-1" },
      body: { name: "Turma Frontend" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const turma = {
      id: "turma-1",
      name: "Turma Frontend",
      status: "ativa",
    };
    turmaService.createTurma.mockResolvedValue(turma);

    await turmaController.create(req, res, next);

    expect(turmaService.createTurma).toHaveBeenCalledWith("admin-1", req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ turma });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros da regra de negócio para o middleware de erro", async () => {
    const req = {
      user: { id: "student-actor" },
      body: { name: "Turma Frontend" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Apenas professor ou admin pode cadastrar turmas.");
    turmaService.createTurma.mockRejectedValue(error);

    await turmaController.create(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
