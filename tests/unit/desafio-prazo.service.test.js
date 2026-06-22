jest.mock("../../src/models/desafio.model", () => ({
  updateMany: jest.fn(),
}));

const Desafio = require("../../src/models/desafio.model");
const {
  getEffectiveChallengeStatus,
  inactivateExpiredChallenges,
  isDeliveryDeadlineExpired,
} = require("../../src/services/desafio-prazo.service");

describe("desafio-prazo.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Desafio.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 2 });
  });

  it("inativa no MongoDB desafios ativos de dias anteriores", async () => {
    await inactivateExpiredChallenges(new Date("2026-06-22T12:00:00.000Z"));

    expect(Desafio.updateMany).toHaveBeenCalledWith(
      {
        status: "ativo",
        deliveryDate: { $ne: null, $lt: new Date("2026-06-22T00:00:00.000Z") },
      },
      { status: "inativo" }
    );
  });

  it("mantém o desafio ativo durante todo o dia limite", () => {
    const desafio = { status: "ativo", deliveryDate: new Date("2026-06-22T00:00:00.000Z") };

    expect(isDeliveryDeadlineExpired(desafio, new Date("2026-06-22T23:59:59.999Z"))).toBe(false);
    expect(getEffectiveChallengeStatus(desafio, new Date("2026-06-22T23:59:59.999Z"))).toBe("ativo");
  });

  it("considera o desafio inativo depois do encerramento da data limite", () => {
    const desafio = { status: "ativo", deliveryDate: new Date("2026-06-22T00:00:00.000Z") };

    expect(isDeliveryDeadlineExpired(desafio, new Date("2026-06-23T00:00:00.000Z"))).toBe(true);
    expect(getEffectiveChallengeStatus(desafio, new Date("2026-06-23T00:00:00.000Z"))).toBe("inativo");
  });
});
