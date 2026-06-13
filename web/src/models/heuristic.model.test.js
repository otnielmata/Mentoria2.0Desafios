import { describe, expect, it } from "vitest";
import {
  buildEmptyHeuristicsState,
  normalizeHeuristicList,
} from "@/models/heuristic.model";

describe("normalizeHeuristicList", () => {
  it("preserva a ordem recebida da API e normaliza titulo e descricao", () => {
    const result = normalizeHeuristicList({
      heuristicas: [
        { _id: "1", titulo: "Primeira", descricao: "Descricao primeira" },
        { _id: "2", title: "Segunda", description: "Descricao segunda" },
      ],
    });

    expect(result).toEqual([
      { id: "1", titulo: "Primeira", descricao: "Descricao primeira" },
      { id: "2", titulo: "Segunda", descricao: "Descricao segunda" },
    ]);
  });

  it("retorna lista vazia quando a API nao envia itens", () => {
    expect(normalizeHeuristicList({ items: [] })).toEqual([]);
  });
});

describe("buildEmptyHeuristicsState", () => {
  it("retorna estado vazio quando nao ha heuristicas", () => {
    expect(buildEmptyHeuristicsState([])).toEqual({
      title: "Nenhuma heuristica encontrada.",
      description: "Quando houver heuristicas disponiveis, elas aparecerao aqui.",
    });
  });

  it("nao retorna estado vazio quando existem heuristicas", () => {
    expect(buildEmptyHeuristicsState([{ id: "1" }])).toBeNull();
  });
});
