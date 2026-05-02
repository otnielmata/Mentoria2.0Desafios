const Heuristic = require("../../src/models/heuristic.model");
const { createHeuristic } = require("../../src/services/heuristic.service");

jest.mock("../../src/models/heuristic.model");

describe("heuristic.service createHeuristic", () => {
  const user = { id: "user-1", email: "user@email.com" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates heuristic with valid payload", async () => {
    Heuristic.findOne.mockResolvedValue(null);
    Heuristic.create.mockResolvedValue({
      id: "heuristic-1",
      title: "Visibilidade de status",
      description: "O sistema deve sempre informar o status.",
      authorId: user.id,
      authorEmail: user.email,
      createdAt: "2026-05-02T00:00:00.000Z",
    });

    const result = await createHeuristic({
      title: "Visibilidade de status",
      description: "O sistema deve sempre informar o status.",
      user,
    });

    expect(Heuristic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Visibilidade de status",
        description: "O sistema deve sempre informar o status.",
        authorId: "user-1",
        authorEmail: "user@email.com",
      })
    );
    expect(result.id).toBe("heuristic-1");
  });

  it("rejects payload without required fields", async () => {
    await expect(
      createHeuristic({
        title: "",
        description: "",
        user,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details: expect.arrayContaining([
        expect.objectContaining({ field: "title" }),
        expect.objectContaining({ field: "description" }),
      ]),
    });
  });

  it("rejects duplicated title for same user", async () => {
    Heuristic.findOne.mockResolvedValue({ id: "heuristic-existing" });

    await expect(
      createHeuristic({
        title: "Consistência",
        description: "Descrição",
        user,
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "HEURISTIC_TITLE_ALREADY_EXISTS",
    });
  });
});
