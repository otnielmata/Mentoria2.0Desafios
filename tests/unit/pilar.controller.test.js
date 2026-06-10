jest.mock("../../src/services/pilar.service", () => ({
  createPilar: jest.fn(),
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

  it("responde com o pilar criado pelo serviço", async () => {
    const req = {
      user: { id: "admin-1" },
      body: { name: "Clareza", description: "Pilar de clareza" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const pilar = {
      id: "pilar-1",
      name: "Clareza",
      description: "Pilar de clareza",
      status: "ativo",
    };
    pilarService.createPilar.mockResolvedValue(pilar);

    await pilarController.create(req, res, next);

    expect(pilarService.createPilar).toHaveBeenCalledWith("admin-1", req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ pilar });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros do serviço para o middleware de erro", async () => {
    const req = {
      user: { id: "admin-1" },
      body: { name: "Clareza" },
    };
    const res = makeResponse();
    const next = jest.fn();
    const error = new Error("Já existe um pilar ativo com este nome.");
    pilarService.createPilar.mockRejectedValue(error);

    await pilarController.create(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
