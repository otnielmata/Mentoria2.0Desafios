import { describe, expect, it } from "vitest";

import contractModule from "./api-endpoints";

const { WEB_API_ENDPOINTS, getActiveWebApiEndpoints, getFutureWebApiEndpoints } = contractModule;

describe("api-endpoints contract", () => {
  it("mantém Configurações como funcionalidade futura na Web", () => {
    const settings = WEB_API_ENDPOINTS.find((endpoint) => endpoint.key === "admin.settings");

    expect(settings).toMatchObject({
      future: true,
      menu: "Configurações",
    });
  });

  it("expõe as rotas administrativas usadas pelas telas ativas", () => {
    const activeKeys = new Set(getActiveWebApiEndpoints().map((endpoint) => endpoint.key));

    expect([...activeKeys]).toEqual(
      expect.arrayContaining([
        "admin.dashboard",
        "admin.students.update",
        "admin.pillars.update",
        "admin.pillars.delete",
        "admin.challenges.update",
        "admin.approvals.evaluate",
        "admin.ranking",
      ])
    );
  });

  it("mantém justificativa para endpoints futuros", () => {
    getFutureWebApiEndpoints().forEach((endpoint) => {
      expect(endpoint.futureReason).toEqual(expect.any(String));
      expect(endpoint.futureReason.length).toBeGreaterThan(20);
    });
  });
});
