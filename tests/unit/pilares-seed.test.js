jest.mock("../../src/models/pilar.model", () => ({
  findOneAndUpdate: jest.fn(),
}));

const Pilar = require("../../src/models/pilar.model");
const { DEFAULT_PILARES, buildDefaultPilarPayload, seedDefaultPilares } = require("../../src/seeds/pilares.seed");
const { normalizeName } = require("../../src/services/text-normalization.service");

describe("pilares.seed", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Pilar.findOneAndUpdate.mockResolvedValue({});
  });

  it("define exatamente os 7 pilares padrão do Método do Alavanque", () => {
    expect(DEFAULT_PILARES.map((pilar) => pilar.name)).toEqual([
      "Conhecimento Técnico Alinhado ao Mercado",
      "Posicionamento e Softskills",
      "Prática",
      "Exposição a Problemas",
      "Compartilhamento",
      "Networking",
      "Visibilidade",
    ]);
  });

  it("normaliza nomes removendo acentos, caixa e espaços extras", () => {
    expect(normalizeName("  CONHECIMENTO   TÉCNICO Alinhado ao Mercado  ")).toBe(
      "conhecimento tecnico alinhado ao mercado"
    );
    expect(normalizeName("Prática")).toBe("pratica");
    expect(normalizeName("Exposição a Problemas")).toBe("exposicao a problemas");
  });

  it("cria pilares com status ativo e sem duplicar em execuções repetidas", async () => {
    await seedDefaultPilares();
    await seedDefaultPilares();

    expect(Pilar.findOneAndUpdate).toHaveBeenCalledTimes(14);
    expect(Pilar.findOneAndUpdate).toHaveBeenCalledWith(
      { normalizedName: "conhecimento tecnico alinhado ao mercado", status: "ativo" },
      {
        $setOnInsert: {
          name: "Conhecimento Técnico Alinhado ao Mercado",
          normalizedName: "conhecimento tecnico alinhado ao mercado",
          description: "Aprendizado técnico conectado às demandas reais do mercado.",
          status: "ativo",
          isDefault: true,
        },
      },
      { upsert: true, new: true }
    );
  });

  it("monta payload padrão com nome normalizado para impedir duplicidade", () => {
    const payload = buildDefaultPilarPayload({
      name: "  PRÁTICA  ",
      description: "Execução prática.",
    });

    expect(payload).toEqual({
      name: "  PRÁTICA  ",
      normalizedName: "pratica",
      description: "Execução prática.",
      status: "ativo",
      isDefault: true,
    });
  });
});
