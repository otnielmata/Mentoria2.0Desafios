const { WEB_API_ENDPOINTS } = require("../../web/src/contracts/api-endpoints");
const {
  CONFIGURATION_ENDPOINT_KEY,
  getConfigurationEndpoint,
  loadConfigurationView,
} = require("../../web/src/controllers/configuration.controller");
const { formatValue, toConfigurationViewModel } = require("../../web/src/models/configuration.model");
const { createConfigurationReadOnlyView } = require("../../web/src/views/configuration.view");

const apiConfiguration = {
  readOnly: true,
  editingEnabled: false,
  ranking: {
    generalVisibleToStudents: true,
  },
  pontuacao: {
    leadershipBonus: {
      enabled: false,
    },
  },
  evolucoes: {
    achievements: {
      enabled: false,
    },
  },
  parameters: [
    {
      id: "ranking-geral-alunos",
      name: "Ranking geral para alunos",
      description: "Define se alunos podem visualizar o ranking geral.",
      category: "ranking",
      type: "boolean",
      enabled: true,
      editable: false,
      status: "ativo",
    },
    {
      id: "conquistas-badges-medalhas",
      name: "Conquistas, badges e medalhas",
      description: "Evolução futura.",
      category: "evolucoes",
      type: "boolean",
      enabled: false,
      editable: false,
      status: "futuro",
    },
  ],
};

describe("web configuration view MR-98", () => {
  it("usa o endpoint real de configurações do contrato Web/API", () => {
    expect(CONFIGURATION_ENDPOINT_KEY).toBe("admin.settings");
    expect(getConfigurationEndpoint()).toEqual(
      expect.objectContaining({
        method: "GET",
        path: "/configuracoes",
        roles: ["professor", "admin"],
      })
    );
    expect(WEB_API_ENDPOINTS).toContainEqual(getConfigurationEndpoint());
  });

  it("carrega configurações e transforma em visão somente leitura", async () => {
    const apiClient = {
      request: jest.fn().mockResolvedValue(apiConfiguration),
    };

    const viewModel = await loadConfigurationView(apiClient);

    expect(apiClient.request).toHaveBeenCalledWith(getConfigurationEndpoint());
    expect(viewModel).toMatchObject({
      title: "Configurações",
      readOnly: true,
      editingAvailable: false,
      rankingGeralAlunos: "Ativo",
      bonusLideranca: "Inativo",
      conquistas: "Inativo",
    });
    expect(viewModel.futureFeatures).toHaveLength(1);
  });

  it("monta uma view que não promete conquistas futuras como ativas", () => {
    const view = createConfigurationReadOnlyView(toConfigurationViewModel(apiConfiguration));

    expect(view.mode).toBe("readonly");
    expect(view.highlights).toEqual(
      expect.arrayContaining([
        { label: "Ranking geral para alunos", value: "Ativo" },
        { label: "Bônus por liderança", value: "Inativo" },
        { label: "Conquistas", value: "Inativo" },
      ])
    );
    expect(view.futureFeatures).toEqual([
      expect.objectContaining({
        id: "conquistas-badges-medalhas",
        planned: true,
      }),
    ]);
  });

  it("formata valores compostos antes de renderizar parâmetros", () => {
    expect(formatValue({ periodos: ["diario", "mensal"], limitePorPeriodo: true })).toBe(
      "periodos: diario, mensal | limitePorPeriodo: true"
    );
  });
});
