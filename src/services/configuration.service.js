const {
  FUNCTIONAL_CONFIGURATION_VERSION,
  categoryDefinitions,
  functionalConfigurationDefinitions,
} = require("../models/functional-configuration.model");

const sensitiveKeyPattern = /(authorization|database|jwt|mongodb|password|private|secret|senha|token|uri)/i;
const sensitiveValuePattern = /(mongodb(\+srv)?:\/\/|bearer\s+|gho_[a-z0-9_]+|jwt[_-]?secret|password=|senha=|begin private key)/i;

function normalizeBoolean(value, defaultValue = false) {
  if (value === true || value === "true" || value === "1" || value === 1) return true;
  if (value === false || value === "false" || value === "0" || value === 0) return false;
  return defaultValue;
}

function hasSensitiveContent(value) {
  return sensitiveKeyPattern.test(String(value || "")) || sensitiveValuePattern.test(String(value || ""));
}

function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return sanitizeObject(value);
  }

  if (hasSensitiveContent(value)) {
    return undefined;
  }

  return value;
}

function sanitizeObject(object) {
  const entries = Object.entries(object || {})
    .map(([key, value]) => {
      if (hasSensitiveContent(key)) {
        return null;
      }

      const sanitizedValue = sanitizeValue(value);
      if (sanitizedValue === undefined) {
        return null;
      }

      return [key, sanitizedValue];
    })
    .filter(Boolean);

  return Object.fromEntries(entries);
}

function applyRuntimeFlags(definition) {
  if (!definition.envFlag) {
    return definition;
  }

  return {
    ...definition,
    enabled: normalizeBoolean(process.env[definition.envFlag], definition.enabled),
  };
}

function normalizeParameter(definition) {
  const config = applyRuntimeFlags(definition);

  return sanitizeObject({
    id: config.id,
    name: config.name,
    description: config.description,
    category: config.category,
    type: config.type,
    enabled: config.enabled,
    editable: config.editable,
    status: config.status,
    value: config.value === undefined ? config.enabled : config.value,
    plannedFeatures: config.plannedFeatures,
    reason: config.reason,
  });
}

function buildCategories(parameters) {
  return categoryDefinitions.map((category) =>
    sanitizeObject({
      ...category,
      parameters: parameters.filter((parameter) => parameter.category === category.id),
    })
  );
}

function findParameter(parameters, id) {
  return parameters.find((parameter) => parameter.id === id);
}

function getFunctionalConfigurations() {
  const parameters = functionalConfigurationDefinitions.map(normalizeParameter);
  const rankingGeneral = findParameter(parameters, "ranking-geral-alunos");
  const rankingHideInactive = findParameter(parameters, "ranking-ocultar-inativos");
  const leadershipBonus = findParameter(parameters, "bonus-lideranca");
  const recurrence = findParameter(parameters, "desafios-recorrentes");
  const achievements = findParameter(parameters, "conquistas-badges-medalhas");

  return sanitizeObject({
    version: FUNCTIONAL_CONFIGURATION_VERSION,
    readOnly: true,
    editingEnabled: false,
    parameters,
    categories: buildCategories(parameters),
    ranking: {
      generalVisibleToStudents: rankingGeneral ? rankingGeneral.enabled : true,
      hideInactiveStudents: rankingHideInactive ? rankingHideInactive.enabled : false,
      editable: false,
    },
    pontuacao: {
      model: "pontuacao_fixa_por_desafio",
      leadershipBonus: {
        enabled: leadershipBonus ? leadershipBonus.enabled : false,
        editable: false,
        status: leadershipBonus ? leadershipBonus.status : "planejado",
      },
      recurrence: {
        enabled: recurrence ? recurrence.enabled : true,
        editable: false,
        periodos: recurrence && recurrence.value ? recurrence.value.periodos : ["diario", "semanal", "mensal"],
        limitePorPeriodo: recurrence && recurrence.value ? recurrence.value.limitePorPeriodo : true,
        acaoAoExceder: recurrence && recurrence.value ? recurrence.value.acaoAoExceder : "bloquear",
      },
    },
    evolucoes: {
      achievements: {
        enabled: achievements ? achievements.enabled : false,
        editable: false,
        status: achievements ? achievements.status : "futuro",
        plannedFeatures: achievements ? achievements.plannedFeatures : ["badges", "medalhas"],
      },
    },
  });
}

function getInitialConfigurations() {
  return getFunctionalConfigurations();
}

function isLeadershipBonusEnabled() {
  const configurations = getFunctionalConfigurations();
  return configurations.pontuacao.leadershipBonus.enabled === true;
}

module.exports = {
  getFunctionalConfigurations,
  getInitialConfigurations,
  hasSensitiveContent,
  isLeadershipBonusEnabled,
  sanitizeObject,
  sanitizeValue,
};
