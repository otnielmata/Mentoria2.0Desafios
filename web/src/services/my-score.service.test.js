import { describe, expect, it, vi } from "vitest";
import { getMyScoreRequest } from "@/services/my-score.service";

describe("services/my-score", () => {
  it("consulta somente o endpoint de minha pontuacao", () => {
    const requester = vi.fn(() => ({ ok: true, data: {} }));

    const result = getMyScoreRequest(requester);

    expect(requester).toHaveBeenCalledWith("/api/pontuacoes/minha");
    expect(result).toEqual({ ok: true, data: {} });
  });
});
