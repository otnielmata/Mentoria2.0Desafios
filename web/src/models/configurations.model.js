import { cleanText } from "@/models/validation.model";

const sensitivePattern = /authorization|database|jwt|mongodb|password|private|secret|senha|token|uri/i;

function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function toText(value, fallback = "") {
  return cleanText(value ?? fallback);
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "sim", "1", "ativo", "permitido"].includes(value.trim().toLowerCase());
  }

  return fallback;
}

function hasSensitiveContent(value = "") {
  return sensitivePattern.test(String(value || ""));
}

function getConfigurationsPayload(payload = {}) {
  return payload.data || payload.configuracoes || payload.configurations || payload;
}

function getParameterList(payload = {}) {
  const value = pickFirst(payload, ["parameters", "parametros", "items", "configuracoes"], []);

  return Array.isArray(value) ? value : [];
}

function getValueLabel(value) {
  if (typeof value === "boolean") {
    return value ? "Ativo" : "Inativo";
  }

  if (value === undefined || value === null || value === "") {
    return "Nao informado";
  }

  return toText(value);
}

function getRankingVisibility(payload = {}) {
  const ranking = payload.ranking || {};
  const rawValue = pickFirst(
    payload,
    ["rankingGeralAlunosPermitido", "rankingVisibleToStudents"],
    pickFirst(ranking, ["generalVisibleToStudents", "geralAlunosPermitido"], undefined)
  );

  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return {
      isAvailable: false,
      label: "Nao informado",
      value: null,
    };
  }

  const value = toBoolean(rawValue);

  return {
    isAvailable: true,
    label: value ? "Permitido para alunos" : "Indisponivel para alunos",
    value,
  };
}

export function toConfigurationParameterDto(parameter = {}, index = 0) {
  if (!parameter || typeof parameter !== "object") {
    const text = toText(parameter);

    return {
      description: "",
      editable: false,
      id: text || `parametro-${index + 1}`,
      name: text || `Parametro ${index + 1}`,
      statusLabel: "Somente leitura",
      type: "text",
      valueLabel: "Nao informado",
    };
  }

  const id = toText(pickFirst(parameter, ["id", "_id", "key", "chave"], `parametro-${index + 1}`));
  const name = toText(pickFirst(parameter, ["name", "nome", "label", "titulo"], id));
  const rawValue = pickFirst(parameter, ["value", "valor", "enabled", "ativo"], "");

  if ([id, name, rawValue].some(hasSensitiveContent)) {
    return null;
  }

  const editable = toBoolean(pickFirst(parameter, ["editable", "editavel"], false));

  return {
    description: toText(pickFirst(parameter, ["description", "descricao"], "")),
    editable,
    id,
    name,
    statusLabel: editable ? "Edicao disponivel" : "Somente leitura",
    type: toText(pickFirst(parameter, ["type", "tipo"], "text")),
    valueLabel: getValueLabel(rawValue),
  };
}

export function toConfigurationsDto(payload = {}) {
  const data = getConfigurationsPayload(payload);
  const parameters = getParameterList(data)
    .map(toConfigurationParameterDto)
    .filter(Boolean);

  return {
    editingEnabled: toBoolean(pickFirst(data, ["editingEnabled", "edicaoDisponivel"], false)),
    isEmpty: parameters.length === 0 && !getRankingVisibility(data).isAvailable,
    parameters,
    rankingVisibility: getRankingVisibility(data),
    readOnly: toBoolean(pickFirst(data, ["readOnly", "somenteLeitura"], true), true),
  };
}
