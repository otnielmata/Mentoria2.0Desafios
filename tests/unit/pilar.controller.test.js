jest.mock("../../src/services/pilar.service", () => ({
  listPilares: jest.fn(),
}));

const pilarService = require("../../src/services/pilar.service");
const pilarController = require("../../src/controllers/pilar.controller");

function makeResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("pilar.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde com a lista de pilares retornada pelo serviço", async () => {
    const req = {
      user: { id: "student-1" },
      query: { status: "ativo" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const pilares = [{ id: "pilar-1", name: "Clareza", status: "ativo" }];
    pilarService.listPilares.mockResolvedValue(pilares);

    await pilarController.list(req, res, next);

    expect(pilarService.listPilares).toHaveBeenCalledWith("student-1", req.query);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ pilares });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros do serviço para o middleware de erro", async () => {
    const req = {
      user: { id: "admin-1" },
      query: { status: ["ativo"] },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("status deve ser um texto válido.");
    pilarService.listPilares.mockRejectedValue(error);

    await pilarController.list(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
