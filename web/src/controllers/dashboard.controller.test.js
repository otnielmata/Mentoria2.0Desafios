import { describe, expect, it, vi } from "vitest";
import { getAdminDashboard, getStudentDashboard } from "@/controllers/dashboard.controller";

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

  it("normaliza resposta de sucesso do dashboard admin para a view", async () => {
    const requestDashboard = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        indicadores: {
          alunosAtivos: 12,
          aprovacoesPendentes: 4,
          totalEnvios: 32,
        },
      },
    });

    await expect(getAdminDashboard({ requestDashboard })).resolves.toMatchObject({
      ok: true,
      data: {
        activeStudents: 12,
        pendingApprovals: 4,
        totalSubmissions: 32,
      },
    });
    expect(requestDashboard).toHaveBeenCalledTimes(1);
  });
});
