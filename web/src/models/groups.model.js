import { cleanText } from "@/models/validation.model";

function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function toText(value, fallback = "") {
  return cleanText(value ?? fallback);
}

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function looksSensitive(value = "") {
  const text = toText(value);

  return /@/.test(text) || /token|senha|password|secret/i.test(text);
}

function getNestedText(source = {}, keys = [], fallback = "") {
  const nested = keys.reduce((found, key) => {
    if (found !== undefined && found !== null) {
      return found;
    }

    return source?.[key];
  }, undefined);

  if (!nested || typeof nested !== "object") {
    const text = toText(nested, fallback);

    return looksSensitive(text) ? fallback : text;
  }

  return toText(pickFirst(nested, ["name", "nome", "title", "titulo"], fallback), fallback);
}

function getNestedId(source = {}, keys = [], fallback = "") {
  const nested = keys.reduce((found, key) => {
    if (found !== undefined && found !== null) {
      return found;
    }

    return source?.[key];
  }, undefined);

  if (!nested || typeof nested !== "object") {
    return toText(nested, fallback);
  }

  return toText(pickFirst(nested, ["id", "_id"], fallback), fallback);
}

function normalizeStatus(status = "") {
  const normalized = toText(status, "pendente").toLowerCase();

  if (normalized === "ajuste_solicitado" || normalized === "ajuste solicitado") {
    return "ajuste";
  }

  return ["pendente", "aprovado", "reprovado", "ajuste"].includes(normalized)
    ? normalized
    : "pendente";
}

function getPillarName(item = {}, desafio = {}, envio = {}) {
  return (
    toText(pickFirst(item, ["pilarNome", "pillarName"], "")) ||
    getNestedText(item, ["pilar", "pillar"], "") ||
    getNestedText(desafio, ["pilar", "pillar"], "") ||
    getNestedText(envio, ["pilar", "pillar"], "") ||
    "Pilar nao informado"
  );
}

function getParticipantDisplayName(participant = {}, index = 0) {
  if (!participant || typeof participant !== "object") {
    const text = toText(participant);

    return looksSensitive(text) ? `Participante ${index + 1}` : text || `Participante ${index + 1}`;
  }

  const name = toText(pickFirst(participant, ["name", "nome", "displayName"], ""));

  return name || `Participante ${index + 1}`;
}

function getParticipantId(participant = {}) {
  if (!participant || typeof participant !== "object") {
    return looksSensitive(participant) ? "" : toText(participant);
  }

  return toText(pickFirst(participant, ["id", "_id", "aluno_id", "alunoId"], ""));
}

function normalizeParticipants(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 5).map((participant, index) => ({
    id: getParticipantId(participant),
    name: getParticipantDisplayName(participant, index),
  }));
}

export const groupStatusLabels = Object.freeze({
  ajuste: "Ajuste solicitado",
  aprovado: "Aprovado",
  pendente: "Pendente",
  reprovado: "Reprovado",
});

export function toGroupDto(item = {}) {
  const envio = item.envio || item.envioDesafio || item.envio_desafio || item.submission || {};
  const desafio = item.desafio || envio.desafio || item.challenge || {};
  const participantsRaw = pickFirst(item, ["participantes", "participants", "alunos", "students"], []);
  const participants = normalizeParticipants(participantsRaw);
  const status = normalizeStatus(pickFirst(item, ["status", "situacao"], "") || envio.status);
  const isApproved = status === "aprovado";
  const submissionId =
    toText(pickFirst(item, ["envio_desafio_id", "envioDesafioId", "submissionId"], "")) ||
    getNestedId({ envio }, ["envio"]);
  const points = toNumber(
    pickFirst(item, ["pontosConcedidos", "pontos", "points", "pontuacao"], 0),
    0
  );
  const rankingConsidered =
    isApproved && pickFirst(item, ["pontuacaoConsideradaNoRanking", "rankingConsidered"], true) !== false;

  return {
    challengeTitle: toText(
      pickFirst(item, ["desafioTitulo", "challengeTitle", "titulo", "title"], "") ||
        pickFirst(desafio, ["title", "titulo", "name", "nome"], "Envio de desafio")
    ),
    className: toText(pickFirst(item, ["turmaNome", "className"], "") || getNestedText(item, ["turma"], "")),
    id: toText(pickFirst(item, ["id", "_id"], "")) || submissionId,
    isApproved,
    leaderName:
      toText(pickFirst(item, ["liderNome", "leaderName", "responsavelNome"], "")) ||
      getNestedText(item, ["lider", "leader", "responsavel", "alunoResponsavel", "aluno_responsavel"], "Responsavel"),
    participants,
    participantsCount: toNumber(
      pickFirst(item, ["totalParticipantes", "participantsCount"], participantsRaw.length),
      participants.length
    ),
    pillarName: getPillarName(item, desafio, envio),
    points,
    pointsLabel: isApproved ? `${points} pontos` : "Sem pontos concedidos",
    rankingConsidered,
    rankingLabel: rankingConsidered
      ? "Pontuacao considerada no ranking"
      : "Pontuacao ainda nao considerada no ranking",
    status,
    statusLabel: groupStatusLabels[status],
    submissionId,
    submissionLabel: submissionId ? `Envio ${submissionId}` : "Envio de desafio",
  };
}

export function getGroupListPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.grupos)) {
    return payload.grupos;
  }

  if (Array.isArray(payload.groups)) {
    return payload.groups;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

export function toGroupsDto(payload = {}) {
  return getGroupListPayload(payload).map(toGroupDto);
}
