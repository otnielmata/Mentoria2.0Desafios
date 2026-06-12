jest.mock("../../src/models/desafio.model", () => ({
  find: jest.fn(),
}));

jest.mock("../../src/models/pilar.model", () => ({
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("../../src/models/user.model", () => ({
  findById: jest.fn(),
}));

const Pilar = require("../../src/models/pilar.model");
const User = require("../../src/models/user.model");
const { updatePilar } = require("../../src/services/pilar.service");

const ADMIN_ID = "6814f12ab3f34872f7558f40";
const PILAR_ID = "6814f12ab3f34872f7558f41";

describe("pilar.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: ADMIN_ID, role: "admin" });
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
