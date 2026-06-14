import { cleanText, createValidationError, createValidationSuccess } from "@/models/validation.model";

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

function getNestedValue(source, keys = [], fallback = "") {
  const nested = keys.reduce((found, key) => {
    if (found !== undefined && found !== null) {
      return found;
    }

    return source?.[key];
  }, undefined);

  if (!nested || typeof nested !== "object") {
    return toText(nested, fallback);
  }

  return toText(
    pickFirst(nested, ["name", "nome", "title", "titulo", "email"], fallback),
    fallback
  );
}

function getNestedId(source, keys = [], fallback = "") {
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

function normalizeEvidenceList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }

  const textValue = toText(value);

  return textValue ? [textValue] : [];
}

export const approvalActions = Object.freeze({
  adjustment: "ajuste",
  approve: "aprovado",
  reject: "reprovado",
});

export const approvalActionLabels = Object.freeze({
  [approvalActions.adjustment]: "Ajuste solicitado",
  [approvalActions.approve]: "Aprovado",
  [approvalActions.reject]: "Reprovado",
});

export const pendingApprovalStatus = "pendente";

export function normalizeApprovalStatus(status = "") {
  const normalized = toText(status, pendingApprovalStatus).toLowerCase();

  if (normalized === "ajuste_solicitado" || normalized === "ajuste solicitado") {
    return approvalActions.adjustment;
  }

  if ([pendingApprovalStatus, ...Object.values(approvalActions)].includes(normalized)) {
    return normalized;
  }

  return pendingApprovalStatus;
}

export function toChallengeApprovalDto(item = {}) {
  const desafio = item.desafio || item.challenge || {};
  const pilar = item.pilar || desafio.pilar || item.pillar || {};
  const status = normalizeApprovalStatus(pickFirst(item, ["status", "situacao"], pendingApprovalStatus));

  return {
    challengeId: toText(
      pickFirst(item, ["desafioId", "desafio_id", "challengeId"], "") ||
        getNestedId({ desafio }, ["desafio"])
    ),
    challengeTitle: toText(
      pickFirst(item, ["desafioTitulo", "challengeTitle", "titulo", "title"], "") ||
        pickFirst(desafio, ["title", "titulo", "name", "nome"], "Desafio")
    ),
    className: toText(pickFirst(item, ["turmaNome", "className"], "") || getNestedValue(item, ["turma"], "")),
    createdAt: toText(pickFirst(item, ["createdAt", "created_at", "data", "submittedAt"], "")),
    description: toText(pickFirst(item, ["description", "descricao"], "")),
    evidences: normalizeEvidenceList(pickFirst(item, ["evidencias", "evidences", "evidence", "evidencia_url"], [])),
    feedback: toText(pickFirst(item, ["feedback", "feedback_admin", "feedbackAdmin"], "")),
    id: toText(pickFirst(item, ["id", "_id", "envio_desafio_id", "envioDesafioId"], "")),
    participantsCount: toNumber(pickFirst(item, ["totalParticipantes", "participantsCount"], 0), 0),
    pillarName: toText(
      pickFirst(item, ["pilarNome", "pillarName"], "") ||
        pickFirst(pilar, ["name", "nome", "title", "titulo"], "Pilar")
    ),
    points: toNumber(pickFirst(item, ["pontos", "points", "pontuacao"], 0), 0),
    status,
    statusLabel: status === pendingApprovalStatus ? "Pendente" : approvalActionLabels[status],
    studentId: toText(
      pickFirst(item, ["alunoId", "aluno_id", "alunoResponsavelId", "studentId"], "") ||
        getNestedId(item, ["aluno", "alunoResponsavel", "aluno_responsavel", "responsavel", "user"])
    ),
    studentName: toText(
      pickFirst(item, ["alunoNome", "studentName", "responsavelNome"], "") ||
        getNestedValue(item, ["aluno", "alunoResponsavel", "aluno_responsavel", "responsavel", "user"], "Aluno")
    ),
    type: toText(pickFirst(item, ["type", "tipo", "tipoEnvio", "tipo_envio"], "individual")),
  };
}

export function getChallengeApprovalListPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.envios)) {
    return payload.envios;
  }

  if (Array.isArray(payload.aprovacoes)) {
    return payload.aprovacoes;
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

export function toChallengeApprovalsDto(payload = {}) {
  return getChallengeApprovalListPayload(payload)
    .map(toChallengeApprovalDto)
    .filter((item) => item.status === pendingApprovalStatus);
}

export function toApprovalReviewRequestDto(payload = {}) {
  return {
    envio_desafio_id: toText(payload.submissionId),
    feedback_admin: toText(payload.feedback),
    status: normalizeApprovalStatus(payload.action),
  };
}

export function validateApprovalReviewPayload(payload = {}) {
  const dto = toApprovalReviewRequestDto(payload);
  const fieldErrors = {};

  if (!dto.envio_desafio_id) {
    fieldErrors.submissionId = "Selecione um envio para avaliar.";
  }

  if (!Object.values(approvalActions).includes(dto.status)) {
    fieldErrors.action = "Selecione uma acao valida para o envio.";
  }

  if (dto.status === approvalActions.adjustment && dto.feedback_admin.length < 10) {
    fieldErrors.feedback = "Informe um feedback com pelo menos 10 caracteres para solicitar ajuste.";
  }

  if (Object.keys(fieldErrors).length) {
    return createValidationError("Revise os dados da avaliacao.", fieldErrors);
  }

  return createValidationSuccess(dto);
}
