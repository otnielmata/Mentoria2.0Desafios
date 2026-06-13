import { beforeEach, describe, expect, it, vi } from "vitest";
import { listHeuristicsRequest } from "@/services/heuristic.service";
import { apiRequest } from "@/services/api/client";
import { getToken } from "@/services/session.service";

vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/services/session.service", () => ({
  getToken: vi.fn(),
}));

describe("heuristic.service listHeuristicsRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia a listagem sem token e direciona para login", async () => {
    getToken.mockReturnValue("");

    const result = await listHeuristicsRequest();

    expect(result).toEqual({
      ok: false,
      message: "Entre na sua conta para visualizar heuristicas.",
      status: 401,
      shouldRedirectToLogin: true,
    });
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("usa somente GET /api/heuristicas quando ha token", async () => {
    getToken.mockReturnValue("jwt-token");
    apiRequest.mockResolvedValue({
      ok: true,
      data: [],
    });

    await listHeuristicsRequest();

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/api/heuristicas");
  });
});
