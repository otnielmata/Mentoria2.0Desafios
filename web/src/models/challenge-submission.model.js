import {
  cleanText,
  createValidationError,
  createValidationSuccess,
} from "@/models/validation.model";

export const submissionTypes = Object.freeze({
  group: "grupo",
  individual: "individual",
});

export const initialChallengeSubmissionForm = {
  desafioId: "",
  description: "",
  evidence: "",
  participants: "",
  pilarId: "",
  turmaId: "",
  type: submissionTypes.individual,
};

function splitParticipantIds(value = "") {
  return cleanText(value)
    .split(/[\n,;]+/)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

export function parseParticipantIds(value = "") {
  return [...new Set(splitParticipantIds(value))];
}

export function toChallengeSubmissionRequestDto(payload = {}) {
  const type = cleanText(payload.type) || submissionTypes.individual;
  const participants = type === submissionTypes.group ? parseParticipantIds(payload.participants) : [];

  return {
    desafioId: cleanText(payload.desafioId),
    description: cleanText(payload.description),
    evidencias: [cleanText(payload.evidence)].filter(Boolean),
    participantes: participants,
    pilarId: cleanText(payload.pilarId),
    turmaId: cleanText(payload.turmaId),
    type,
  };
}

export function toChallengeSubmissionResponseDto(payload = {}) {
  return {
    id: cleanText(payload.id || payload._id),
    status: cleanText(payload.status) || "pendente",
  };
}

function hasDuplicateParticipants(value = "") {
  const participants = splitParticipantIds(value);

  return new Set(participants).size !== participants.length;
}

function isValidSubmissionType(type) {
  return Object.values(submissionTypes).includes(type);
}

export function validateChallengeSubmissionPayload(payload = {}) {
  const dto = toChallengeSubmissionRequestDto(payload);
  const fieldErrors = {};

  if (!dto.pilarId) {
    fieldErrors.pilarId = "Selecione o pilar do Metodo do Alavanque.";
  }

  if (!dto.desafioId) {
    fieldErrors.desafioId = "Informe o identificador do desafio.";
  }

  if (!dto.turmaId) {
    fieldErrors.turmaId = "Informe a turma do envio.";
  }

  if (!isValidSubmissionType(dto.type)) {
    fieldErrors.type = "Selecione envio individual ou em grupo.";
  }

  if (dto.description.length < 10) {
    fieldErrors.description = "Descreva o que foi feito com pelo menos 10 caracteres.";
  }

  if (dto.evidencias.length === 0) {
    fieldErrors.evidence = "Informe uma evidencia, link, texto ou comprovante.";
  }

  if (dto.type === submissionTypes.group) {
    if (dto.participantes.length === 0) {
      fieldErrors.participants = "Informe pelo menos um participante do grupo.";
    } else if (dto.participantes.length > 5) {
      fieldErrors.participants = "Selecione no maximo 5 participantes.";
    } else if (hasDuplicateParticipants(payload.participants)) {
      fieldErrors.participants = "Participantes nao podem ser repetidos.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return createValidationError("Revise os campos do envio.", fieldErrors);
  }

  return createValidationSuccess(dto);
}
