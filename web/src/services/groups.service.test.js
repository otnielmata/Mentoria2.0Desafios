import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { listGroupsRequest } from "@/services/groups.service";

describe("services/groups", () => {
  it("consulta apenas o endpoint GET de grupos", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: [] });

    await listGroupsRequest(requester);

    expect(apiEndpoints.groups.collection).toBe("/api/grupos");
    expect(requester).toHaveBeenCalledWith("/api/grupos");
  });
});
