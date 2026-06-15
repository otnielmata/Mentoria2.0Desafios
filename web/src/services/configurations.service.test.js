import { describe, expect, it, vi } from "vitest";
import { apiEndpoints } from "@/services/api/endpoints";
import { getConfigurationsRequest } from "@/services/configurations.service";

describe("services/configurations", () => {
  it("consulta apenas o endpoint GET de configuracoes", async () => {
    const requester = vi.fn().mockResolvedValue({ ok: true, data: {} });

    await getConfigurationsRequest(requester);

    expect(apiEndpoints.configurations.collection).toBe("/api/configuracoes");
    expect(requester).toHaveBeenCalledWith("/api/configuracoes");
  });
});
