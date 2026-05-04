const heuristicService = require("../../src/services/heuristic.service");
const heuristicController = require("../../src/controllers/heuristic.controller");

jest.mock("../../src/services/heuristic.service");

describe("heuristic.controller list", () => {
  function buildResponse() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the heuristic collection with success", async () => {
    const heuristics = [
      {
        id: "heuristic-1",
        title: "Visibilidade de status",
        description: "Informe o usuário sobre o que está acontecendo.",
      },
    ];
    heuristicService.listHeuristics.mockResolvedValue(heuristics);
    const res = buildResponse();
    const next = jest.fn();

    await heuristicController.list({}, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(heuristics);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns an empty collection with success", async () => {
    heuristicService.listHeuristics.mockResolvedValue([]);
    const res = buildResponse();

    await heuristicController.list({}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it("delegates unexpected errors to error middleware", async () => {
    const error = new Error("Database unavailable");
    heuristicService.listHeuristics.mockRejectedValue(error);
    const next = jest.fn();

    await heuristicController.list({}, buildResponse(), next);

    expect(next).toHaveBeenCalledWith(error);
  });
});
