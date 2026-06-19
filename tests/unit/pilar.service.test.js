jest.mock("../../src/models/desafio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pilar.model", () => ({
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const Pilar = require("../../src/models/pilar.model");
const { DEFAULT_PILARES } = require("../../src/seeds/pilares.seed");
const User = require("../../src/models/user.model");
const { listPilares, updatePilar } = require("../../src/services/pilar.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const PILAR_ID = "6814f12ab3f34872f7558f41";

describe("pilar.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
  });

  it("consulta pilares garantindo os 7 padrões pelo backend", async () => {
    Pilar.findOneAndUpdate.mockResolvedValue({});
    Pilar.countDocuments.mockResolvedValue(7);
    Pilar.find.mockReturnValue({
      sort: jest.fn(() => ({
        skip: jest.fn(() => ({
          limit: jest.fn(() => ({
            lean: jest.fn().mockResolvedValue(
              DEFAULT_PILARES.map((pilar, index) => ({
                _id: `6814f12ab3f34872f7558f4${index}`,
                description: pilar.description,
                isDefault: true,
                name: pilar.name,
                normalizedName: pilar.name.toLowerCase(),
                status: "ativo",
              }))
            ),
          })),
        })),
      })),
    });

    const result = await listPilares(ADMIN_ID);

    expect(Pilar.findOneAndUpdate).toHaveBeenCalledTimes(7);
    expect(result.total).toBe(7);
    expect(result.pilares.map((pilar) => pilar.name)).toEqual(DEFAULT_PILARES.map((pilar) => pilar.name));
  });

  it("bloqueia edição para nome ativo duplicado", async () => {
    Pilar.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: PILAR_ID,
        name: "Prática",
        normalizedName: "pratica",
        status: "ativo",
      }),
    });
    Pilar.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: "6814f12ab3f34872f7558f42", normalizedName: "networking", status: "ativo" }),
    });

    await expect(updatePilar(ADMIN_ID, PILAR_ID, { name: "Networking" })).rejects.toMatchObject({
      statusCode: 409,
      message: "Pilar já cadastrado.",
    });

    expect(Pilar.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
