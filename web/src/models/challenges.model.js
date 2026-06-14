import {
  cleanText,
  createValidationError,
  createValidationSuccess,
} from "@/models/validation.model";

export const challengeTypes = Object.freeze({
  both: "ambos",
  group: "grupo",
  individual: "individual",
});

export const challengeTypeLabels = {
  [challengeTypes.individual]: "Individual",
  [challengeTypes.group]: "Grupo",
  [challengeTypes.both]: "Individual ou grupo",
};

export const challengeStatusLabels = {
  ativo: "Ativo",
  inativo: "Inativo",
  rascunho: "Rascunho",
};

export const challengeTypeOptions = Object.entries(challengeTypeLabels).map(([value, label]) => ({
  label,
  value,
}));

export const challengeStatusOptions = Object.entries(challengeStatusLabels).map(([value, label]) => ({
  label,
  value,
}));

export const initialChallengeForm = {
  description: "",
  maxParticipants: "1",
  pillarId: "",
  points: "",
  status: "ativo",
  title: "",
  type: challengeTypes.individual,
};

function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function getChallengePayload(payload = {}) {
  return payload.desafio || payload.challenge || payload.data || payload;
}

function getChallengesPayload(payload = {}) {
  const candidates = [
    payload.desafios,
    payload.challenges,
    payload.items,
    payload.results,
    payload.data,
    payload,
  ];
  const list = candidates.find(Array.isArray);

  return list || [];
}

function getPillarData(data = {}) {
  return pickFirst(data, ["pilar", "pillar", "topico", "topic"], {});
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = 0) {
  return Math.trunc(toNumber(value, fallback));
}

export function normalizeChallengeType(type = "") {
  const value = cleanText(type).toLowerCase();

  return challengeTypeLabels[value] ? value : challengeTypes.individual;
}

export function normalizeChallengeStatus(status = "") {
  const value = cleanText(status).toLowerCase();

  return challengeStatusLabels[value] ? value : "ativo";
}

export function toChallengeRequestDto(payload = {}) {
  return {
    descricao: cleanText(payload.description),
    max_participantes: toInteger(payload.maxParticipants),
    pilarId: cleanText(payload.pillarId),
    pontos: toInteger(payload.points),
    status: cleanText(payload.status).toLowerCase() || "ativo",
    tipo: cleanText(payload.type).toLowerCase() || challengeTypes.individual,
    titulo: cleanText(payload.title),
  };
}

export function toChallengeDto(payload = {}) {
  const data = getChallengePayload(payload);
  const pillar = getPillarData(data);
  const type = normalizeChallengeType(pickFirst(data, ["tipo", "type"], challengeTypes.individual));
  const status = normalizeChallengeStatus(pickFirst(data, ["status", "situacao"], "ativo"));

  return {
    description: cleanText(pickFirst(data, ["descricao", "description"], "")),
    id: cleanText(pickFirst(data, ["id", "_id", "desafioId", "challengeId"], "")),
    maxParticipants: toInteger(pickFirst(data, ["max_participantes", "maxParticipantes", "maxParticipants"], 1), 1),
    pillarId: cleanText(
      pickFirst(data, ["pilarId", "pilar_id", "pillarId"], "") ||
        pickFirst(pillar, ["id", "_id", "pilarId", "pillarId"], "")
    ),
    pillarName: cleanText(
      pickFirst(data, ["pilarNome", "pilar_nome", "pillarName"], "") ||
        pickFirst(pillar, ["nome", "name", "titulo", "title"], "Pilar")
    ),
    points: toInteger(pickFirst(data, ["pontos", "points", "pontuacao"], 0)),
    status,
    statusLabel: challengeStatusLabels[status],
    title: cleanText(pickFirst(data, ["titulo", "title", "nome", "name"], "Desafio")),
    type,
    typeLabel: challengeTypeLabels[type],
  };
}

export function toChallengesDto(payload = {}) {
  return getChallengesPayload(payload).map(toChallengeDto);
}

function validatesGroupSize(type, maxParticipants) {
  return ![challengeTypes.group, challengeTypes.both].includes(type) || maxParticipants <= 5;
}

export function validateChallengePayload(payload = {}) {
  const dto = toChallengeRequestDto(payload);
  const fieldErrors = {};

  if (!dto.pilarId) {
    fieldErrors.pillarId = "Selecione o pilar do desafio.";
  }

  if (dto.titulo.length < 3) {
    fieldErrors.title = "Informe um titulo com pelo menos 3 caracteres.";
  }

  if (dto.descricao.length < 10) {
    fieldErrors.description = "Informe uma descricao com pelo menos 10 caracteres.";
  }

  if (!Number.isInteger(dto.pontos) || dto.pontos <= 0) {
    fieldErrors.points = "Informe uma pontuacao fixa maior que zero.";
  }

  if (!challengeTypeLabels[dto.tipo]) {
    fieldErrors.type = "Selecione um tipo valido.";
  }

  if (!Number.isInteger(dto.max_participantes) || dto.max_participantes <= 0) {
    fieldErrors.maxParticipants = "Informe o maximo de participantes.";
  } else if (!validatesGroupSize(dto.tipo, dto.max_participantes)) {
    fieldErrors.maxParticipants = "Desafios em grupo aceitam no maximo 5 participantes.";
  }

  if (!challengeStatusLabels[dto.status]) {
    fieldErrors.status = "Selecione um status valido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return createValidationError("Revise os dados do desafio.", fieldErrors);
  }

  return createValidationSuccess(dto);
}
