import { describe, expect, it } from "vitest";

import contractModule from "./api-endpoints";

const { WEB_API_ENDPOINTS, getActiveWebApiEndpoints, getFutureWebApiEndpoints } = contractModule;

describe("api-endpoints contract", () => {
  it("expõe Configurações como gestão ativa de usuários e perfis", () => {
    const settingsUsers = WEB_API_ENDPOINTS.filter((endpoint) => endpoint.menu === "Configurações" && endpoint.feature === "Configurações");

    expect(settingsUsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "admin.users.list", method: "GET", path: "/users", roles: ["admin"] }),
        expect.objectContaining({ key: "admin.users.create", method: "POST", path: "/users", roles: ["admin"] }),
        expect.objectContaining({ key: "admin.users.update", method: "PATCH", path: "/users/:id", roles: ["admin"] }),
      ])
    );
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
        "admin.users.list",
        "admin.users.create",
        "admin.users.update",
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
