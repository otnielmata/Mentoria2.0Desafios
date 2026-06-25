const fs = require("fs");
const path = require("path");
const {
  WEB_API_ENDPOINTS,
  getActiveWebApiEndpoints,
  getFutureWebApiEndpoints,
  toApiPath,
  toRouteKey,
} = require("../../web/src/contracts/api-endpoints");

const routeModules = [
  { base: "/auth", router: require("../../src/routes/auth.routes") },
  { base: "/usuarios", router: require("../../src/routes/usuario.routes") },
  { base: "", router: require("../../src/routes/admin-baixa-participacao.routes") },
  { base: "", router: require("../../src/routes/admin-dashboard.routes") },
  { base: "", router: require("../../src/routes/admin-envio-desafio.routes") },
  { base: "", router: require("../../src/routes/admin-pontuacao.routes") },
  { base: "", router: require("../../src/routes/admin-relatorio-participacao.routes") },
  { base: "", router: require("../../src/routes/auditoria.routes") },
  { base: "", router: require("../../src/routes/cupom.routes") },
  { base: "", router: require("../../src/routes/desafio.routes") },
  { base: "", router: require("../../src/routes/envio-desafio.routes") },
  { base: "", router: require("../../src/routes/evento-ao-vivo.routes") },
  { base: "", router: require("../../src/routes/grupo.routes") },
  { base: "", router: require("../../src/routes/me-dashboard.routes") },
  { base: "", router: require("../../src/routes/me-pontuacao.routes") },
  { base: "", router: require("../../src/routes/pilar.routes") },
  { base: "", router: require("../../src/routes/plano-estudo.routes") },
  { base: "", router: require("../../src/routes/profile.routes") },
  { base: "", router: require("../../src/routes/ranking.routes") },
  { base: "", router: require("../../src/routes/student.routes") },
  { base: "", router: require("../../src/routes/turma.routes") },
  { base: "/configuracoes", router: require("../../src/routes/configuration.routes") },
  { base: "/users", router: require("../../src/routes/users.routes") },
];

function normalizePath(base, routePath) {
  if (routePath === "/") return base || "/";
  return `${base}${routePath}`;
}

function collectRouteKeys() {
  return routeModules.flatMap(({ base, router }) =>
    router.stack
      .filter((layer) => layer.route)
      .flatMap((layer) =>
        Object.keys(layer.route.methods).map((method) => `${method.toUpperCase()} ${normalizePath(base, layer.route.path)}`)
      )
  );
}

describe("web/api contract MR-97", () => {
  it("mantém uma lista centralizada de endpoints consumidos pela Web", () => {
    expect(WEB_API_ENDPOINTS.length).toBeGreaterThan(0);

    WEB_API_ENDPOINTS.forEach((endpoint) => {
      expect(endpoint).toEqual(
        expect.objectContaining({
          key: expect.any(String),
          feature: expect.any(String),
          screen: expect.any(String),
          menu: expect.any(String),
          method: expect.any(String),
          path: expect.stringMatching(/^\//),
        })
      );
    });
  });

  it("não duplica chaves de contrato", () => {
    const keys = WEB_API_ENDPOINTS.map((endpoint) => endpoint.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("valida que cada endpoint ativo da Web existe na API", () => {
    const routeKeys = new Set(collectRouteKeys());
    const missing = getActiveWebApiEndpoints()
      .filter((endpoint) => !routeKeys.has(toRouteKey(endpoint)))
      .map((endpoint) => `${endpoint.screen} > ${endpoint.menu}: ${toRouteKey(endpoint)}`);

    if (missing.length > 0) {
      throw new Error(`Endpoints divergentes entre Web e API:\n${missing.join("\n")}`);
    }

    expect(missing).toEqual([]);
  });

  it("exige marcação explícita para endpoints futuros", () => {
    getFutureWebApiEndpoints().forEach((endpoint) => {
      expect(endpoint.future).toBe(true);
      expect(endpoint.futureReason).toEqual(expect.any(String));
      expect(endpoint.futureReason.length).toBeGreaterThan(20);
    });
  });

  it("mantém Swagger alinhado com endpoints ativos do contrato", () => {
    const swagger = fs.readFileSync(path.resolve(__dirname, "../../docs/swagger.yaml"), "utf8");
    const missingDocs = getActiveWebApiEndpoints()
      .filter((endpoint) => !swagger.includes(toApiPath(endpoint)))
      .map((endpoint) => `${endpoint.screen}: ${endpoint.method} ${toApiPath(endpoint)}`);

    if (missingDocs.length > 0) {
      throw new Error(`Endpoints ativos sem documentação Swagger:\n${missingDocs.join("\n")}`);
    }

    expect(missingDocs).toEqual([]);
  });
});
