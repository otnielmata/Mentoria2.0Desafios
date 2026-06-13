export const architectureLayers = [
  {
    id: "routes",
    path: "src/app",
    responsibility: "Rotas, layouts e composicao de paginas seguindo o App Router do Next.js.",
  },
  {
    id: "views",
    path: "src/views",
    responsibility: "Views de tela que cuidam da interface e recebem estado/acoes por propriedades.",
  },
  {
    id: "components",
    path: "src/components",
    responsibility: "Componentes visuais reutilizaveis, sem montar URLs ou conhecer contratos HTTP.",
  },
  {
    id: "controllers",
    path: "src/controllers",
    responsibility: "Orquestracao de acoes de tela, validacoes e chamadas aos services.",
  },
  {
    id: "models",
    path: "src/models",
    responsibility: "DTOs, normalizacoes e validacoes de contratos usados pelo front-end.",
  },
  {
    id: "services",
    path: "src/services",
    responsibility: "Integracao com API REST, sessao local e adaptadores externos.",
  },
];

export const exampleFlows = {
  login: {
    route: "src/app/login/page.js",
    view: "src/views/auth/LoginView.js",
    controller: "src/controllers/auth.controller.js",
    model: "src/models/auth.model.js",
    service: "src/services/auth.service.js",
    adapter: "src/services/api/client.js",
  },
};

export function getLayerById(id) {
  return architectureLayers.find((layer) => layer.id === id) || null;
}

export function isApiIntegrationLayer(path = "") {
  return path.startsWith("src/services/");
}
