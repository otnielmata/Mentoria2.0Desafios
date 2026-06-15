import { describe, expect, it, vi } from "vitest";
import { getGeneralRanking } from "@/controllers/ranking.controller";

describe("controllers/ranking", () => {
  it("normaliza ranking geral quando a API responde com sucesso", async () => {
    const requestRanking = vi.fn(async () => ({
      data: {
        ranking: [{ aluno: { name: "Ana Costa" }, posicao: 1, totalPontos: 470 }],
      },
      ok: true,
      status: 200,
    }));

    const result = await getGeneralRanking({ requestRanking });

    expect(result.ok).toBe(true);
    expect(result.data.entries[0]).toMatchObject({
      points: 470,
      position: 1,
      studentName: "Ana Costa",
    });
  });

  it("usa mensagem simples quando ranking nao estiver permitido", async () => {
    const requestRanking = vi.fn(async () => ({
      message: "Forbidden",
      ok: false,
      status: 403,
      type: "api",
    }));

    const result = await getGeneralRanking({ requestRanking });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Ranking indisponivel para alunos no momento.");
    expect(result.type).toBe("ranking_unavailable");
  });
});
