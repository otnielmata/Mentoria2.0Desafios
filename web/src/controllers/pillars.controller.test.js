import { describe, expect, it, vi } from "vitest";
import { getPillars } from "@/controllers/pillars.controller";

describe("controllers/pillars", () => {
  it("normaliza listagem de pilares para a view", async () => {
    const requestPillars = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        pilares: [
          {
            descricao: "Base tecnica alinhada ao mercado.",
            nome: "Conhecimento Tecnico Alinhado ao Mercado",
          },
        ],
      },
    });

    await expect(getPillars({ requestPillars })).resolves.toMatchObject({
      ok: true,
      data: [
        {
          description: "Base tecnica alinhada ao mercado.",
          name: "Conhecimento Tecnico Alinhado ao Mercado",
        },
      ],
    });
    expect(requestPillars).toHaveBeenCalledTimes(1);
  });

  it("preserva erros da API para estados assincronos", async () => {
    const requestPillars = vi.fn().mockResolvedValue({
      ok: false,
      message: "Falha controlada.",
      type: "network",
    });

    await expect(getPillars({ requestPillars })).resolves.toEqual({
      ok: false,
      message: "Falha controlada.",
      type: "network",
    });
  });
});
