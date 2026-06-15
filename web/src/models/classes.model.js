import {
  cleanText,
  createValidationError,
  createValidationSuccess,
} from "@/models/validation.model";

export const classStatusLabels = {
  ativa: "Ativa",
  encerrada: "Encerrada",
  inativa: "Inativa",
  planejada: "Planejada",
};

export const classStatusOptions = Object.entries(classStatusLabels).map(([value, label]) => ({
  label,
  value,
}));

export const initialClassForm = {
  endDate: "",
  name: "",
  startDate: "",
  status: "ativa",
};

function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function getClassPayload(payload = {}) {
  return payload.turma || payload.class || payload.classe || payload.data || payload;
}

function getClassesPayload(payload = {}) {
  const candidates = [
    payload.turmas,
    payload.classes,
    payload.items,
    payload.results,
    payload.data,
    payload,
  ];
  const list = candidates.find(Array.isArray);

  return list || [];
}

function isValidDate(value = "") {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function isEndBeforeStart(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }

  return new Date(`${endDate}T00:00:00`).getTime() < new Date(`${startDate}T00:00:00`).getTime();
}

export function normalizeClassStatus(status = "") {
  const value = cleanText(status).toLowerCase();

  return classStatusLabels[value] ? value : "ativa";
}

export function toClassRequestDto(payload = {}) {
  return {
    data_fim: cleanText(payload.endDate),
    data_inicio: cleanText(payload.startDate),
    nome: cleanText(payload.name),
    status: cleanText(payload.status).toLowerCase() || "ativa",
  };
}

export function toClassDto(payload = {}) {
  const data = getClassPayload(payload);
  const status = normalizeClassStatus(pickFirst(data, ["status", "situacao"], "ativa"));

  return {
    endDate: cleanText(pickFirst(data, ["data_fim", "dataFim", "endDate", "fim"], "")),
    id: cleanText(pickFirst(data, ["id", "_id", "turmaId"], "")),
    name: cleanText(pickFirst(data, ["nome", "name"], "Turma")),
    startDate: cleanText(pickFirst(data, ["data_inicio", "dataInicio", "startDate", "inicio"], "")),
    status,
    statusLabel: classStatusLabels[status],
  };
}

export function toClassesDto(payload = {}) {
  return getClassesPayload(payload).map(toClassDto);
}

export function validateClassPayload(payload = {}) {
  const dto = toClassRequestDto(payload);
  const fieldErrors = {};

  if (dto.nome.length < 2) {
    fieldErrors.name = "Informe o nome da turma.";
  }

  if (!isValidDate(dto.data_inicio)) {
    fieldErrors.startDate = "Informe uma data de inicio valida.";
  }

  if (!isValidDate(dto.data_fim)) {
    fieldErrors.endDate = "Informe uma data de fim valida.";
  } else if (isEndBeforeStart(dto.data_inicio, dto.data_fim)) {
    fieldErrors.endDate = "A data final nao pode ser anterior a data inicial.";
  }

  if (!classStatusLabels[dto.status]) {
    fieldErrors.status = "Selecione um status valido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return createValidationError("Revise os dados da turma.", fieldErrors);
  }

  return createValidationSuccess(dto);
}
