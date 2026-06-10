jest.mock("../../src/services/pilar.service", () => ({
  getPilarById: jest.fn(),
}));

const pilarService = require("../../src/services/pilar.service");
const pilarController = require("../../src/controllers/pilar.controller");

function makeResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  return res;
}

describe("pilar.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde com pilar visualizado", async () => {
    const pilar = {
      id: "6814f12ab3f34872f7558f49",
      name: "Clareza",
      description: "Pilar de clareza",
      status: "ativo",
      desafios: [],
    };
    const req = {
      user: { id: "user-1" },
      params: { id: pilar.id },
    };
    const res = makeResponse();
    const next = jest.fn();
    pilarService.getPilarById.mockResolvedValue(pilar);

    await pilarController.show(req, res, next);

    expect(pilarService.getPilarById).toHaveBeenCalledWith("user-1", pilar.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ pilar });
    expect(next).not.toHaveBeenCalled();
  });

  it("encaminha erros para o middleware", async () => {
    const error = new Error("Pilar não encontrado.");
    const req = {
      user: { id: "user-1" },
      params: { id: "6814f12ab3f34872f7558f49" },
    };
    const res = makeResponse();
    const next = jest.fn();
    pilarService.getPilarById.mockRejectedValue(error);

    await pilarController.show(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
