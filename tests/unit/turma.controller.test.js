jest.mock("../../src/services/turma.service", () => ({
  closeTurma: jest.fn(),
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

  it("responde com a turma encerrada retornada pelo serviço", async () => {
    const validTurmaId = "6814f12ab3f34872f7558f49";
    const req = {
      user: { id: "admin-1" },
      params: { id: validTurmaId },
    };
    const res = makeResponse();
    const next = jest.fn();
    const turma = {
      id: validTurmaId,
      name: "Turma Frontend",
      status: "encerrada",
    };
    turmaService.closeTurma.mockResolvedValue(turma);

    await turmaController.close(req, res, next);

    expect(turmaService.closeTurma).toHaveBeenCalledWith("admin-1", validTurmaId);
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
    turmaService.closeTurma.mockRejectedValue(error);

    await turmaController.close(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
