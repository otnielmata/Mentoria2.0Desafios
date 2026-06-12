jest.mock("../../src/models/pilar.model", () => ({
  find: jest.fn(),
}));

const Pilar = require("../../src/models/pilar.model");
const { DEFAULT_PILARES } = require("../../src/seeds/pilares.seed");
const { listPilares } = require("../../src/services/pilar.service");
const { normalizeName } = require("../../src/services/text-normalization.service");

function mockPilarFind(records) {
  const query = {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(records),
  };

  Pilar.find.mockReturnValue(query);
  return query;
}

describe("pilar.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lista pilares ativos incluindo os 7 pilares padrão", async () => {
    const records = DEFAULT_PILARES.map((pilar, index) => ({
      _id: `6814f12ab3f34872f7558f4${index}`,
      name: pilar.name,
      normalizedName: normalizeName(pilar.name),
      description: pilar.description,
      status: "ativo",
      isDefault: true,
    }));
    const query = mockPilarFind(records);

    const result = await listPilares();

    expect(Pilar.find).toHaveBeenCalledWith({ status: "ativo" });
    expect(query.sort).toHaveBeenCalledWith({ name: 1 });
    expect(result.total).toBe(7);
    expect(result.pilares.map((pilar) => pilar.name)).toEqual(DEFAULT_PILARES.map((pilar) => pilar.name));
    expect(result.pilares.every((pilar) => pilar.status === "ativo")).toBe(true);
  });
});
