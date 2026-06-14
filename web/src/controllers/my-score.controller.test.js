import { describe, expect, it, vi } from "vitest";
import { getMyScore } from "@/controllers/my-score.controller";

describe("controllers/my-score", () => {
  it("normaliza dados de minha pontuacao quando a API responde com sucesso", async () => {
    const requestScore = vi.fn(async () => ({
      data: {
        historico: [{ pontos: 20 }],
        pontosPorPilar: [{ nome: "Pratica", pontos: 20 }],
        totalPontos: 20,
      },
      ok: true,
      status: 200,
    }));

    const result = await getMyScore({ requestScore });

    expect(result.ok).toBe(true);
    expect(result.data.totalPoints).toBe(20);
    expect(result.data.history[0].points).toBe(20);
    expect(result.data.pointsByPillar.find((item) => item.name === "Pratica").points).toBe(20);
  });

  it("preserva erros da API sem tentar normalizar dados", async () => {
    const apiError = { message: "Sessao expirada", ok: false, type: "unauthorized" };
    const requestScore = vi.fn(async () => apiError);

    await expect(getMyScore({ requestScore })).resolves.toBe(apiError);
  });
});
