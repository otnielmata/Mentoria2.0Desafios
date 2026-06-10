jest.mock("../../src/services/turma.service", () => ({
  getTurmaById: jest.fn(),
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

  it("responde com a turma retornada pelo serviço", async () => {
    const req = {
      user: { id: "admin-1" },
      params: { id: "6814f12ab3f34872f7558f49" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const turma = {
      id: req.params.id,
      name: "Turma Frontend",
      status: "ativa",
      studentCount: 24,
    };
    turmaService.getTurmaById.mockResolvedValue(turma);

    await turmaController.getById(req, res, next);

    expect(turmaService.getTurmaById).toHaveBeenCalledWith("admin-1", req.params.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ turma });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros do serviço para o middleware de erro", async () => {
    const req = {
      user: { id: "admin-1" },
      params: { id: "id-invalido" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Turma não encontrada.");
    turmaService.getTurmaById.mockRejectedValue(error);

    await turmaController.getById(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
