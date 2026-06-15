import { toChallengeDto, toChallengesDto, validateChallengePayload } from "@/models/challenges.model";
import { withApiFieldErrors } from "@/models/validation.model";
import { createChallengeRequest, listChallengesRequest } from "@/services/challenges.service";

function normalizeChallengeFieldErrors(result) {
  const fieldErrors = { ...(result.fieldErrors || {}) };
  const aliases = {
    descricao: "description",
    maxParticipantes: "maxParticipants",
    max_participantes: "maxParticipants",
    pilar: "pillarId",
    pilar_id: "pillarId",
    pilarId: "pillarId",
    pontuacao: "points",
    pontos: "points",
    tipo: "type",
    titulo: "title",
  };

  Object.entries(aliases).forEach(([apiField, viewField]) => {
    if (fieldErrors[apiField] && !fieldErrors[viewField]) {
      fieldErrors[viewField] = fieldErrors[apiField];
      delete fieldErrors[apiField];
    }
  });

  return {
    ...result,
    fieldErrors,
  };
}

export async function getChallenges({ requestChallenges = listChallengesRequest } = {}) {
  const result = await requestChallenges();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toChallengesDto(result.data),
  };
}

export async function createChallenge(payload, { requestCreateChallenge = createChallengeRequest } = {}) {
  const validation = validateChallengePayload(payload);

  if (!validation.ok) {
    return validation;
  }

  const result = normalizeChallengeFieldErrors(
    withApiFieldErrors(await requestCreateChallenge(validation.data))
  );

  if (!result.ok) {
    return result;
  }

  const challenge = toChallengeDto(result.data);

  return {
    ...result,
    data: challenge,
    message: "Desafio cadastrado com sucesso.",
  };
}
