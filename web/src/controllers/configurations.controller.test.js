import { describe, expect, it, vi } from "vitest";
import { getConfigurations } from "@/controllers/configurations.controller";

describe("controllers/configurations", () => {
  it("normaliza configuracoes para a view", async () => {
    const requestConfigurations = vi.fn().mockResolvedValue({
      data: {
        parameters: [{ id: "ranking", name: "Ranking", value: true }],
        ranking: { generalVisibleToStudents: true },
      },
      ok: true,
    });

    await expect(getConfigurations({ requestConfigurations })).resolves.toMatchObject({
      data: {
        isEmpty: false,
        parameters: [{ name: "Ranking", valueLabel: "Ativo" }],
        rankingVisibility: { label: "Permitido para alunos" },
      },
      ok: true,
    });
  });

  it("propaga falha de API sem normalizar dados", async () => {
    const requestConfigurations = vi.fn().mockResolvedValue({
      message: "Nao autorizado.",
      ok: false,
      status: 403,
    });

    await expect(getConfigurations({ requestConfigurations })).resolves.toMatchObject({
      message: "Nao autorizado.",
      ok: false,
    });
  });
});
