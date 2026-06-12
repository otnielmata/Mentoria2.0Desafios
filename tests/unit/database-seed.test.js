jest.mock("mongoose", () => ({
  connect: jest.fn(),
}));

jest.mock("../../src/seeds/pilares.seed", () => ({
  seedDefaultPilares: jest.fn(),
}));

const mongoose = require("mongoose");
const { seedDefaultPilares } = require("../../src/seeds/pilares.seed");
const { connectDatabase } = require("../../src/config/database");

describe("database config", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connect.mockResolvedValue({});
    seedDefaultPilares.mockResolvedValue();
  });

  it("executa o seed dos pilares após conectar no MongoDB", async () => {
    await connectDatabase();

    expect(mongoose.connect).toHaveBeenCalled();
    expect(seedDefaultPilares).toHaveBeenCalledTimes(1);
  });
});
