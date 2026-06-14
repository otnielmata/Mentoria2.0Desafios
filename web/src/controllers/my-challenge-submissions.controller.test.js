import { describe, expect, it, vi } from "vitest";
import { getMyChallengeSubmissions } from "@/controllers/my-challenge-submissions.controller";

describe("controllers/my-challenge-submissions", () => {
  it("normaliza resposta de sucesso para a view", async () => {
    const requestSubmissions = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        envios: [{ id: "envio-1", status: "aprovado", title: "Desafio" }],
      },
    });

    await expect(getMyChallengeSubmissions({ requestSubmissions })).resolves.toMatchObject({
      data: [
        {
          challengeTitle: "Desafio",
          id: "envio-1",
          status: "aprovado",
          statusLabel: "Aprovado",
        },
      ],
      ok: true,
    });
  });

  it("preserva erro da API para estado de erro amigavel", async () => {
    const requestSubmissions = vi.fn().mockResolvedValue({
      message: "Falha controlada.",
      ok: false,
      type: "network",
    });

    await expect(getMyChallengeSubmissions({ requestSubmissions })).resolves.toEqual({
      message: "Falha controlada.",
      ok: false,
      type: "network",
    });
  });
});
