import { describe, expect, it, vi } from "vitest";
import { createClass, getClasses } from "@/controllers/classes.controller";

describe("controllers/classes", () => {
  it("normaliza listagem de turmas para a view", async () => {
    const requestClasses = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        turmas: [
          {
            data_fim: "2026-08-30",
            data_inicio: "2026-08-01",
            nome: "Turma Agosto",
            status: "ativa",
          },
        ],
      },
    });

    await expect(getClasses({ requestClasses })).resolves.toMatchObject({
      ok: true,
      data: [
        {
          endDate: "2026-08-30",
          name: "Turma Agosto",
          startDate: "2026-08-01",
          statusLabel: "Ativa",
        },
      ],
    });
    expect(requestClasses).toHaveBeenCalledTimes(1);
  });

  it("impede cadastro com data final anterior a inicial", async () => {
    const requestCreateClass = vi.fn();

    await expect(
      createClass(
        {
          endDate: "2026-08-01",
          name: "Turma Invalida",
          startDate: "2026-08-10",
          status: "ativa",
        },
        { requestCreateClass }
      )
    ).resolves.toMatchObject({
      ok: false,
      fieldErrors: {
        endDate: "A data final nao pode ser anterior a data inicial.",
      },
    });
    expect(requestCreateClass).not.toHaveBeenCalled();
  });

  it("envia cadastro valido para API e recarrega DTO de resposta", async () => {
    const requestCreateClass = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        data_fim: "2026-08-30",
        data_inicio: "2026-08-01",
        nome: "Turma Agosto",
        status: "ativa",
      },
    });

    await expect(
      createClass(
        {
          endDate: "2026-08-30",
          name: "Turma Agosto",
          startDate: "2026-08-01",
          status: "ativa",
        },
        { requestCreateClass }
      )
    ).resolves.toMatchObject({
      ok: true,
      data: {
        name: "Turma Agosto",
        statusLabel: "Ativa",
      },
      message: "Turma cadastrada com sucesso.",
    });
    expect(requestCreateClass).toHaveBeenCalledWith({
      data_fim: "2026-08-30",
      data_inicio: "2026-08-01",
      nome: "Turma Agosto",
      status: "ativa",
    });
  });
});
