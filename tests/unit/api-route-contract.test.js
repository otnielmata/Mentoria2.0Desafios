const fs = require("fs");
const path = require("path");

const routeModules = [
  { base: "", router: require("../../src/routes/admin-dashboard.routes") },
  { base: "", router: require("../../src/routes/admin-envio-desafio.routes") },
  { base: "", router: require("../../src/routes/admin-relatorio-participacao.routes") },
  { base: "", router: require("../../src/routes/desafio.routes") },
  { base: "", router: require("../../src/routes/envio-desafio.routes") },
  { base: "", router: require("../../src/routes/grupo.routes") },
  { base: "", router: require("../../src/routes/me-dashboard.routes") },
  { base: "", router: require("../../src/routes/me-pontuacao.routes") },
  { base: "", router: require("../../src/routes/pilar.routes") },
  { base: "", router: require("../../src/routes/ranking.routes") },
  { base: "", router: require("../../src/routes/turma.routes") },
  { base: "/configuracoes", router: require("../../src/routes/configuration.routes") },
  { base: "/users", router: require("../../src/routes/users.routes") },
];

const webContractRouteKeys = [
  "GET /users/me",
  "GET /users",
  "POST /users",
  "GET /turmas",
  "POST /turmas",
  "GET /pilares",
  "POST /pilares",
  "GET /desafios",
  "POST /desafios",
  "POST /envios-desafios",
  "GET /envios-desafios/meus",
  "GET /envios-desafios/aprovacoes",
  "PATCH /envios-desafios/aprovacoes",
  "GET /grupos",
  "GET /grupos/meus",
  "GET /pontuacoes/minha",
  "GET /dashboard/aluno",
  "GET /dashboard/admin",
  "GET /ranking",
  "GET /ranking/admin",
  "GET /relatorios/participacao",
  "GET /configuracoes",
];

function normalizePath(base, path) {
  if (path === "/") {
    return base || "/";
  }

  return `${base}${path}`;
}

function collectRoutes() {
  return routeModules.flatMap(({ base, router }) =>
    router.stack
      .filter((layer) => layer.route)
      .flatMap((layer) =>
        Object.keys(layer.route.methods).map((method) => ({
          handlers: layer.route.stack.map((handler) => handler.name || "anonymous"),
          key: `${method.toUpperCase()} ${normalizePath(base, layer.route.path)}`,
        }))
      )
  );
}

function findRoute(routes, key) {
  return routes.find((route) => route.key === key);
}

describe("api route contract MR-91", () => {
  it("monta os módulos de domínio no roteador principal", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../../src/routes/index.js"), "utf8");

    expect(source).toContain('router.use("/users", usersRoutes)');
    expect(source).toContain('router.use("/configuracoes", configurationRoutes)');
    expect(source).toContain("router.use(adminDashboardRoutes)");
    expect(source).toContain("router.use(adminEnvioDesafioRoutes)");
    expect(source).toContain("router.use(meDashboardRoutes)");
    expect(source).toContain("router.use(mePontuacaoRoutes)");
    expect(source).toContain("router.use(rankingRoutes)");
  });

  it("registra todas as rotas mínimas consumidas pela Web", () => {
    const routeKeys = collectRoutes().map((route) => route.key);

    expect(routeKeys).toEqual(
      expect.arrayContaining(webContractRouteKeys)
    );
  });

  it("mantém autenticação obrigatória nas rotas do contrato da Web", () => {
    const routes = collectRoutes();

    webContractRouteKeys.forEach((key) => {
      const route = findRoute(routes, key);

      expect(route).toBeDefined();
      expect(route.handlers[0]).toBe("authMiddleware");
    });
  });

  it("protege rotas administrativas com autenticação e autorização por perfil", () => {
    const routes = collectRoutes();
    const adminRouteKeys = [
      "GET /users",
      "POST /users",
      "GET /turmas",
      "POST /turmas",
      "POST /pilares",
      "POST /desafios",
      "GET /envios-desafios/aprovacoes",
      "PATCH /envios-desafios/aprovacoes",
      "GET /grupos",
      "GET /dashboard/admin",
      "GET /ranking/admin",
      "GET /relatorios/participacao",
      "GET /configuracoes",
    ];

    adminRouteKeys.forEach((key) => {
      const route = findRoute(routes, key);

      expect(route).toBeDefined();
      expect(route.handlers[0]).toBe("authMiddleware");
      expect(route.handlers).toHaveLength(3);
    });
  });

  it("documenta no Swagger as rotas reais consumidas pela Web", () => {
    const swagger = fs.readFileSync(path.resolve(__dirname, "../../docs/swagger.yaml"), "utf8");

    [
      "/api/users/me",
      "/api/users",
      "/api/envios-desafios/meus",
      "/api/envios-desafios/aprovacoes",
      "/api/grupos/meus",
      "/api/pontuacoes/minha",
      "/api/dashboard/aluno",
      "/api/dashboard/admin",
      "/api/ranking",
      "/api/ranking/admin",
      "/api/relatorios/participacao",
      "/api/configuracoes",
    ].forEach((endpoint) => {
      expect(swagger).toContain(endpoint);
    });
  });
});
