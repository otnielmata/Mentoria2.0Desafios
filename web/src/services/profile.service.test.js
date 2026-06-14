import { describe, expect, it, vi } from "vitest";
import { getProfileRequest } from "@/services/profile.service";

describe("services/profile", () => {
  it("consulta somente o endpoint do usuario autenticado", () => {
    const requester = vi.fn(() => ({ ok: true, data: {} }));

    const result = getProfileRequest(requester);

    expect(requester).toHaveBeenCalledWith("/api/users/me");
    expect(result).toEqual({ ok: true, data: {} });
  });
});
