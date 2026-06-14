import { describe, expect, it, vi } from "vitest";
import { getGeneralRankingRequest } from "@/services/ranking.service";

describe("services/ranking", () => {
  it("consulta somente o endpoint do ranking geral", () => {
    const requester = vi.fn(() => ({ ok: true, data: [] }));

    const result = getGeneralRankingRequest(requester);

    expect(requester).toHaveBeenCalledWith("/api/ranking");
    expect(result).toEqual({ ok: true, data: [] });
  });
});
