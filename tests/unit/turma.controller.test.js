jest.mock("../../src/services/turma.service", () => ({
  listTurmas: jest.fn(),
}));

const turmaService = require("../../src/services/turma.service");
const turmaController = require("../../src/controllers/turma.controller");

function makeResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return res;
}

describe("turma.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde com lista de turmas retornada pelo serviço", async () => {
    const req = {
      user: { id: "admin-1" },
      query: { page: "1", limit: "10", status: "ativa" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const serviceResult = {
      turmas: [{ id: "turma-1", name: "Turma Frontend", status: "ativa" }],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    };
    turmaService.listTurmas.mockResolvedValue(serviceResult);

    await turmaController.list(req, res, next);

    expect(turmaService.listTurmas).toHaveBeenCalledWith("admin-1", req.query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros do serviço para o middleware de erro", async () => {
    const req = { user: { id: "student-1" }, query: {} };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Apenas professor ou admin pode listar turmas.");
    turmaService.listTurmas.mockRejectedValue(error);

    await turmaController.list(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
