import { describe, expect, it, vi } from "vitest";
import { getGroups } from "@/controllers/groups.controller";

describe("controllers/groups", () => {
  it("normaliza grupos para a view", async () => {
    const requestGroups = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        grupos: [
          {
            envio_desafio_id: "envio-1",
            liderNome: "Maria",
            participantes: [{ nome: "Joao" }],
            status: "pendente",
            titulo: "Pratica em grupo",
          },
        ],
      },
    });

    await expect(getGroups({ requestGroups })).resolves.toMatchObject({
      ok: true,
      data: [
        {
          challengeTitle: "Pratica em grupo",
          leaderName: "Maria",
          participants: [{ name: "Joao" }],
          statusLabel: "Pendente",
          submissionId: "envio-1",
        },
      ],
    });
    expect(requestGroups).toHaveBeenCalledTimes(1);
  });

  it("propaga falha de API sem normalizar dados", async () => {
    const requestGroups = vi.fn().mockResolvedValue({
      ok: false,
      message: "Nao autorizado.",
      status: 403,
    });

    await expect(getGroups({ requestGroups })).resolves.toMatchObject({
      ok: false,
      message: "Nao autorizado.",
    });
  });
});
