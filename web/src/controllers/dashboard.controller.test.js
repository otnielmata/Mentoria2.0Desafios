import { describe, expect, it, vi } from "vitest";
import { getStudentDashboard } from "@/controllers/dashboard.controller";

describe("controllers/dashboard", () => {
  it("normaliza resposta de sucesso para a view", async () => {
    const requestDashboard = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        desafiosAprovados: 4,
        desafiosPendentes: 2,
        pontosTotais: 80,
        posicaoRanking: 3,
      },
    });

    await expect(getStudentDashboard({ requestDashboard })).resolves.toMatchObject({
      ok: true,
      data: {
        approvedChallenges: 4,
        pendingChallenges: 2,
        rankingPosition: 3,
        totalPoints: 80,
      },
    });
    expect(requestDashboard).toHaveBeenCalledTimes(1);
  });

  it("preserva erro da API para o estado assincrono da tela", async () => {
    const requestDashboard = vi.fn().mockResolvedValue({
      ok: false,
      message: "Falha controlada.",
      type: "network",
    });

    await expect(getStudentDashboard({ requestDashboard })).resolves.toEqual({
      ok: false,
      message: "Falha controlada.",
      type: "network",
    });
  });
});
