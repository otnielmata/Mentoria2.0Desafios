const FUNCTIONAL_CONFIGURATION_VERSION = "mvp-1";

const leadershipBonusConfiguration = Object.freeze({
  id: "bonus-lideranca",
  name: "Bônus por liderança",
  description: "Regra opcional planejada para conceder pontos extras ao líder do envio em grupo.",
  category: "pontuacao",
  type: "boolean",
  enabled: false,
  editable: false,
  status: "planejado",
  reason: "O MVP ainda não possui endpoint seguro para editar ou aplicar bônus de liderança.",
});

const functionalConfigurationDefinitions = Object.freeze([
  Object.freeze({
    id: "ranking-geral-alunos",
    name: "Ranking geral para alunos",
    description: "Define se alunos podem visualizar o ranking geral no MVP.",
    category: "ranking",
    type: "boolean",
    enabled: true,
    editable: false,
    status: "ativo",
  }),
  Object.freeze({
    id: "ranking-ocultar-inativos",
    name: "Ocultar alunos inativos no ranking",
    description: "Permite remover alunos inativos da visualização de ranking quando a operação decidir ativar essa regra.",
    category: "ranking",
    type: "boolean",
    envFlag: "RANKING_HIDE_INACTIVE_STUDENTS",
    enabled: false,
    editable: false,
    status: "opcional",
  }),
  Object.freeze({
    id: "modelo-pontuacao-fixa",
    name: "Modelo de pontuação",
    description: "Modelo inicial usado para conceder pontos depois da aprovação do professor/admin.",
    category: "pontuacao",
    type: "text",
    value: "Pontuação fixa por desafio",
    enabled: true,
    editable: false,
    status: "ativo",
  }),
  leadershipBonusConfiguration,
  Object.freeze({
    id: "desafios-recorrentes",
    name: "Desafios recorrentes",
    description: "Permite limitar pontuação por aluno em desafios recorrentes dentro de período diário, semanal ou mensal.",
    category: "pontuacao",
    type: "object",
    enabled: true,
    editable: false,
    status: "ativo",
    value: {
      periodos: ["diario", "semanal", "mensal"],
      limitePorPeriodo: true,
      acaoAoExceder: "bloquear",
    },
  }),
  Object.freeze({
    id: "conquistas-badges-medalhas",
    name: "Conquistas, badges e medalhas",
    description: "Badges e medalhas são evolução futura e não estão ativos no MVP.",
    category: "evolucoes",
    type: "boolean",
    enabled: false,
    editable: false,
    status: "futuro",
    plannedFeatures: ["badges", "medalhas"],
  }),
]);

const categoryDefinitions = Object.freeze([
  Object.freeze({
    id: "ranking",
    name: "Ranking e visibilidade",
    description: "Configurações de visualização de rankings para alunos, professores e administradores.",
  }),
  Object.freeze({
    id: "pontuacao",
    name: "Pontuação e aprovação",
    description: "Regras de pontuação aplicadas pela API após aprovação de envios.",
  }),
  Object.freeze({
    id: "evolucoes",
    name: "Evoluções futuras",
    description: "Funcionalidades planejadas que não devem aparecer como ativas no MVP.",
  }),
]);

module.exports = {
  FUNCTIONAL_CONFIGURATION_VERSION,
  categoryDefinitions,
  functionalConfigurationDefinitions,
  leadershipBonusConfiguration,
};
