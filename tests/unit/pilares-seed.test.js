jest.mock("../../src/models/pilar.model", () => ({
  findOneAndUpdate: jest.fn(),
}));

const Pilar = require("../../src/models/pilar.model");
const { DEFAULT_PILARES, seedDefaultPilares } = require("../../src/seeds/pilares.seed");

describe("pilares.seed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Pilar.findOneAndUpdate.mockResolvedValue({});
  });

  it("cria os 7 pilares padrão de forma idempotente", async () => {
    await seedDefaultPilares();

    expect(DEFAULT_PILARES).toHaveLength(7);
    expect(Pilar.findOneAndUpdate).toHaveBeenCalledTimes(7);
    expect(Pilar.findOneAndUpdate).toHaveBeenCalledWith(
      { normalizedName: "conhecimento tecnico alinhado ao mercado", status: "ativo" },
      expect.objectContaining({
        $setOnInsert: expect.objectContaining({
          name: "Conhecimento Técnico Alinhado ao Mercado",
          status: "ativo",
          isDefault: true,
        }),
      }),
      { upsert: true, new: true }
    );
  });
});
