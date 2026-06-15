const FUTURE_STATUS = "futuro";

function toBooleanLabel(value) {
  return value ? "Ativo" : "Inativo";
}

function normalizeParameter(parameter = {}) {
  return {
    id: parameter.id,
    title: parameter.name,
    description: parameter.description,
    category: parameter.category,
    status: parameter.status || (parameter.enabled ? "ativo" : "inativo"),
    value: parameter.type === "boolean" ? toBooleanLabel(parameter.enabled) : parameter.value,
    readOnly: parameter.editable !== true,
    planned: parameter.status === FUTURE_STATUS || parameter.enabled === false,
  };
}

function toConfigurationViewModel(configuration = {}) {
  const parameters = (configuration.parameters || []).map(normalizeParameter);

  return {
    title: "Configurações",
    readOnly: configuration.readOnly !== false || configuration.editingEnabled !== true,
    editingAvailable: configuration.editingEnabled === true,
    rankingGeralAlunos: toBooleanLabel(configuration.ranking && configuration.ranking.generalVisibleToStudents),
    bonusLideranca: toBooleanLabel(configuration.pontuacao && configuration.pontuacao.leadershipBonus && configuration.pontuacao.leadershipBonus.enabled),
    conquistas: toBooleanLabel(configuration.evolucoes && configuration.evolucoes.achievements && configuration.evolucoes.achievements.enabled),
    parameters,
    futureFeatures: parameters.filter((parameter) => parameter.status === FUTURE_STATUS),
  };
}

module.exports = {
  normalizeParameter,
  toConfigurationViewModel,
};
