import { describe, expect, it } from "vitest";
import {
  hasAllMethodPillars,
  methodPillarNames,
  toPillarDto,
  toPillarsDto,
  toPillarSelectOptions,
} from "@/models/pillars.model";

describe("models/pillars", () => {
  it("mantem os sete pilares principais do Metodo do Alavanque", () => {
    expect(methodPillarNames).toEqual([
      "Conhecimento Tecnico Alinhado ao Mercado",
      "Posicionamento e Softskills",
      "Pratica",
      "Exposicao a Problemas",
      "Compartilhamento",
      "Networking",
      "Visibilidade",
    ]);
  });

  it("normaliza pilar retornado pela API", () => {
    expect(
      toPillarDto({
        _id: "pilar-1",
        descricao: "Base tecnica alinhada ao mercado.",
        nome: "Conhecimento Tecnico Alinhado ao Mercado",
        status: "ativo",
      })
    ).toEqual({
      description: "Base tecnica alinhada ao mercado.",
      id: "pilar-1",
      name: "Conhecimento Tecnico Alinhado ao Mercado",
      status: "ativo",
    });
  });

  it("aceita listas em aliases comuns da API", () => {
    expect(
      toPillarsDto({
        pilares: [{ description: "Relacionamentos", name: "Networking" }],
      })
    ).toMatchObject([
      {
        description: "Relacionamentos",
        name: "Networking",
      },
    ]);
  });

  it("identifica cobertura dos sete pilares sem criar seed no front-end", () => {
    const pillars = methodPillarNames.map((name) => ({ name }));

    expect(hasAllMethodPillars(pillars)).toBe(true);
    expect(hasAllMethodPillars(pillars.slice(0, 6))).toBe(false);
  });

  it("cria opcoes de select a partir dos pilares da API", () => {
    expect(
      toPillarSelectOptions([
        { id: "pilar-1", name: "Pratica" },
        { id: "", name: "Visibilidade" },
      ])
    ).toEqual([
      { label: "Pratica", value: "pilar-1" },
      { label: "Visibilidade", value: "Visibilidade" },
    ]);
  });
});
