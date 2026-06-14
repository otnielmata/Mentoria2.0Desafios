import { describe, expect, it } from "vitest";
import {
  initialClassForm,
  toClassDto,
  toClassRequestDto,
  toClassesDto,
  validateClassPayload,
} from "@/models/classes.model";

describe("models/classes", () => {
  it("normaliza payload de cadastro de turma para a API", () => {
    expect(
      toClassRequestDto({
        endDate: "2026-08-30",
        name: " Turma Agosto ",
        startDate: "2026-08-01",
        status: "ATIVA",
      })
    ).toEqual({
      data_fim: "2026-08-30",
      data_inicio: "2026-08-01",
      nome: "Turma Agosto",
      status: "ativa",
    });
  });

  it("normaliza turmas retornadas pela API", () => {
    expect(
      toClassDto({
        _id: "turma-1",
        data_fim: "2026-08-30",
        data_inicio: "2026-08-01",
        nome: "Turma Agosto",
        status: "planejada",
      })
    ).toEqual({
      endDate: "2026-08-30",
      id: "turma-1",
      name: "Turma Agosto",
      startDate: "2026-08-01",
      status: "planejada",
      statusLabel: "Planejada",
    });
  });

  it("aceita listas em aliases comuns da API", () => {
    expect(
      toClassesDto({
        turmas: [{ dataFim: "2026-09-30", dataInicio: "2026-09-01", nome: "Turma Setembro" }],
      })
    ).toMatchObject([
      {
        endDate: "2026-09-30",
        name: "Turma Setembro",
        startDate: "2026-09-01",
      },
    ]);
  });

  it("valida nome, datas e periodo antes de chamar a API", () => {
    const result = validateClassPayload({
      ...initialClassForm,
      endDate: "2026-07-01",
      name: "",
      startDate: "2026-07-10",
    });

    expect(result).toMatchObject({
      ok: false,
      fieldErrors: {
        endDate: "A data final nao pode ser anterior a data inicial.",
        name: "Informe o nome da turma.",
      },
      message: "Revise os dados da turma.",
    });
  });
});
