const sensitivePattern = /(authorization|database|jwt|mongodb|password|private|secret|senha|token|uri)/i;

const configurationParameters = Object.freeze([
  {
    description: "Define se alunos podem visualizar o ranking geral no MVP.",
    editable: false,
    id: "ranking-geral-alunos",
    name: "Ranking geral para alunos",
    type: "boolean",
    value: true,
  },
  {
    description: "Modelo inicial usado para conceder pontos depois da aprovação.",
    editable: false,
    id: "modelo-pontuacao",
    name: "Modelo de pontuação",
    type: "text",
    value: "Pontuação fixa por desafio",
  },
  {
    description: "Regra opcional planejada, mantida desligada até existir endpoint de edição.",
    editable: false,
    id: "bonus-lideranca",
    name: "Bônus por liderança",
    type: "boolean",
    value: false,
  },
  {
    description: "Badges e medalhas são evolução futura e não estão ativos no MVP.",
    editable: false,
    id: "conquistas",
    name: "Conquistas",
    type: "boolean",
    value: false,
  },
]);

function hasSensitiveContent(value) {
  return sensitivePattern.test(String(value || ""));
}

function sanitizeParameter(parameter) {
  const entries = Object.entries(parameter).filter(([key, value]) => {
    return !hasSensitiveContent(key) && !hasSensitiveContent(value);
  });

  return Object.fromEntries(entries);
}

function getInitialConfigurations() {
  const parameters = configurationParameters.map(sanitizeParameter);

  return {
    editingEnabled: false,
    parameters,
    ranking: {
      generalVisibleToStudents: true,
    },
    readOnly: true,
  };
}

module.exports = {
  getInitialConfigurations,
  hasSensitiveContent,
  sanitizeParameter,
};
