function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function toText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function getNestedName(source, key, fallback = "") {
  const nested = source?.[key];

  if (!nested || typeof nested !== "object") {
    return toText(nested, fallback);
  }

  return toText(nested.name || nested.nome || nested.title || nested.titulo, fallback);
}

function getNestedId(source, key, fallback = "") {
  const nested = source?.[key];

  if (!nested || typeof nested !== "object") {
    return toText(nested, fallback);
  }

  return toText(nested.id || nested._id, fallback);
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

function normalizeEvidenceList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }

  const textValue = toText(value);

  return textValue ? [textValue] : [];
}

export const submissionStatusLabels = Object.freeze({
  ajuste: "Ajuste solicitado",
  aprovado: "Aprovado",
  pendente: "Pendente",
  reprovado: "Reprovado",
});

export function toMyChallengeSubmissionDto(item = {}) {
  const desafio = item.desafio || item.challenge || {};
  const pilar = item.pilar || desafio.pilar || item.pillar || {};

  return {
    challengeTitle: toText(
      pickFirst(item, ["desafioTitulo", "challengeTitle", "titulo", "title"], "") ||
        pickFirst(desafio, ["title", "titulo", "name", "nome"], "Desafio")
    ),
    createdAt: toText(pickFirst(item, ["createdAt", "created_at", "data", "submittedAt"], "")),
    description: toText(pickFirst(item, ["description", "descricao"], "")),
    evidences: normalizeEvidenceList(pickFirst(item, ["evidencias", "evidences", "evidence", "evidencia_url"], [])),
    feedback: toText(pickFirst(item, ["feedback", "feedback_admin", "feedbackAdmin"], "")),
    id: toText(pickFirst(item, ["id", "_id", "envio_desafio_id", "envioDesafioId"], "")),
    pillarId: toText(pickFirst(item, ["pilarId", "pilar_id"], "") || getNestedId({ pilar }, "pilar")),
    pillarName: toText(
      pickFirst(item, ["pilarNome", "pillarName"], "") ||
        pickFirst(pilar, ["name", "nome", "title", "titulo"], "Pilar")
    ),
    status: normalizeStatus(pickFirst(item, ["status", "situacao"], "pendente")),
    statusLabel: submissionStatusLabels[normalizeStatus(pickFirst(item, ["status", "situacao"], "pendente"))],
    turmaName: toText(
      pickFirst(item, ["turmaNome", "className"], "") || getNestedName(item, "turma", "")
    ),
    type: toText(pickFirst(item, ["type", "tipo", "tipoEnvio", "tipo_envio"], "individual")),
  };
}

export function getSubmissionListPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.envios)) {
    return payload.envios;
  }

  if (Array.isArray(payload.items)) {
    return payload.items;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.submissions)) {
    return payload.submissions;
  }

  return [];
}

export function toMyChallengeSubmissionsDto(payload = {}) {
  return getSubmissionListPayload(payload).map(toMyChallengeSubmissionDto);
}
