import { beforeEach, describe, expect, it, vi } from "vitest";
import { listHeuristics } from "@/controllers/heuristic.controller";
import { listHeuristicsRequest } from "@/services/heuristic.service";

vi.mock("@/services/heuristic.service", () => ({
  createHeuristicRequest: vi.fn(),
  listHeuristicsRequest: vi.fn(),
}));

describe("heuristic.controller listHeuristics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normaliza a resposta da API para a view", async () => {
    listHeuristicsRequest.mockResolvedValue({
      ok: true,
      data: {
        items: [{ _id: "1", titulo: "Titulo", descricao: "Descricao completa" }],
      },
    });

    const result = await listHeuristics();

    expect(result).toEqual({
      ok: true,
      data: [{ id: "1", titulo: "Titulo", descricao: "Descricao completa" }],
      emptyState: null,
    });
  });

  it("retorna estado vazio quando a API nao envia heuristicas", async () => {
    listHeuristicsRequest.mockResolvedValue({
      ok: true,
      data: [],
    });

    const result = await listHeuristics();

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([]);
    expect(result.emptyState).toEqual({
      title: "Nenhuma heuristica encontrada.",
      description: "Quando houver heuristicas disponiveis, elas aparecerao aqui.",
    });
  });

  it("repassa erro de carregamento para a view", async () => {
    listHeuristicsRequest.mockResolvedValue({
      ok: false,
      message: "Falha ao carregar heuristicas.",
    });

    const result = await listHeuristics();

    expect(result).toEqual({
      ok: false,
      message: "Falha ao carregar heuristicas.",
    });
  });
});
