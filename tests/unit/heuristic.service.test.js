jest.mock("../../src/models/heuristic.model");

const Heuristic = require("../../src/models/heuristic.model");
const { createHeuristic, listHeuristics } = require("../../src/services/heuristic.service");

describe("heuristic.service", () => {
  const user = { id: "user-1", email: "user@email.com" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("cadastra heurística com autoria e título único por usuário", async () => {
    Heuristic.findOne.mockResolvedValue(null);
    Heuristic.create.mockResolvedValue({
      id: "heuristic-1",
      title: "Visibilidade de status",
      description: "Informe o usuário sobre o que está acontecendo.",
      authorId: user.id,
      authorEmail: user.email,
      createdAt: "2026-05-02T00:00:00.000Z",
    });

    const result = await createHeuristic({
      title: " Visibilidade de status ",
      description: " Informe o usuário sobre o que está acontecendo. ",
      user,
    });

    expect(Heuristic.findOne).toHaveBeenCalledWith({
      authorId: "user-1",
      normalizedTitle: "visibilidade de status",
    });
    expect(Heuristic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Visibilidade de status",
        description: "Informe o usuário sobre o que está acontecendo.",
        authorId: "user-1",
        authorEmail: "user@email.com",
      })
    );
    expect(result.id).toBe("heuristic-1");
  });

  it("lista somente heurísticas ativas e publicáveis ordenadas por criação", async () => {
    const lean = jest.fn().mockResolvedValue([
      { _id: "h2", title: "Consistência", description: "Use padrões.", createdAt: "2026-05-04T10:00:00.000Z" },
      { _id: "h1", title: "Feedback", description: "Mostre status.", createdAt: "2026-05-03T10:00:00.000Z" },
    ]);
    const sort = jest.fn(() => ({ lean }));
    Heuristic.find.mockReturnValue({ sort });

    const result = await listHeuristics();

    expect(Heuristic.find).toHaveBeenCalledWith({
      isActive: { $ne: false },
      isPublicable: { $ne: false },
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toHaveLength(2);
  });
});
