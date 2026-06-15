const FUTURE_STATUS = "futuro";

function toBooleanLabel(value) {
  return value ? "Ativo" : "Inativo";
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(", ") : item}`)
      .join(" | ");
  }

  if (value === undefined || value === null || value === "") {
    return "Não informado";
  }

  return String(value);
}

function normalizeParameter(parameter = {}) {
  return {
    id: parameter.id,
    title: parameter.name,
    description: parameter.description,
    category: parameter.category,
    status: parameter.status || (parameter.enabled ? "ativo" : "inativo"),
    value: parameter.type === "boolean" ? toBooleanLabel(parameter.enabled) : formatValue(parameter.value),
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
  formatValue,
  normalizeParameter,
  toConfigurationViewModel,
};
