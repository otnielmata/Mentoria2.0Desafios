const Heuristic = require("../../src/models/heuristic.model");
const { listHeuristics } = require("../../src/services/heuristic.service");

jest.mock("../../src/models/heuristic.model");

describe("heuristic.service listHeuristics", () => {
  let sort;
  let lean;

  beforeEach(() => {
    jest.clearAllMocks();

    lean = jest.fn();
    sort = jest.fn(() => ({ lean }));
    Heuristic.find.mockReturnValue({ sort });
  });

  it("lists active and publicable heuristics ordered by newest first", async () => {
    lean.mockResolvedValue([
      {
        _id: "heuristic-2",
        title: "Consistência",
        description: "Mantenha padrões visuais e de interação.",
        createdAt: "2026-05-04T10:00:00.000Z",
      },
      {
        _id: "heuristic-1",
        title: "Visibilidade de status",
        description: "Informe o usuário sobre o que está acontecendo.",
        createdAt: "2026-05-03T10:00:00.000Z",
      },
    ]);

    const result = await listHeuristics();

    expect(Heuristic.find).toHaveBeenCalledWith({
      isActive: { $ne: false },
      isPublicable: { $ne: false },
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toEqual([
      {
        id: "heuristic-2",
        title: "Consistência",
        description: "Mantenha padrões visuais e de interação.",
        createdAt: "2026-05-04T10:00:00.000Z",
      },
      {
        id: "heuristic-1",
        title: "Visibilidade de status",
        description: "Informe o usuário sobre o que está acontecendo.",
        createdAt: "2026-05-03T10:00:00.000Z",
      },
    ]);
  });

  it("returns an empty list when there are no heuristics", async () => {
    lean.mockResolvedValue([]);

    await expect(listHeuristics()).resolves.toEqual([]);
  });
});
