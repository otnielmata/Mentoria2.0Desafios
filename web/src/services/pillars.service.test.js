import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { listPillarsRequest } from "@/services/pillars.service";

describe("services/pillars", () => {
  it("lista pilares usando o endpoint unico de pilares", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: [] });

    await listPillarsRequest(requester);

    expect(requester).toHaveBeenCalledTimes(1);
    expect(requester).toHaveBeenCalledWith(apiEndpoints.pillars.collection);
    expect(apiEndpoints.pillars.collection).toBe("/api/pilares");
  });
});
