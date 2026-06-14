import {
  toChallengeSubmissionResponseDto,
  validateChallengeSubmissionPayload,
} from "@/models/challenge-submission.model";
import { withApiFieldErrors } from "@/models/validation.model";
import { submitChallengeSubmissionRequest } from "@/services/challenge-submission.service";

function normalizeSubmissionFieldErrors(result) {
  const fieldErrors = { ...(result.fieldErrors || {}) };

  if (fieldErrors.evidencias && !fieldErrors.evidence) {
    fieldErrors.evidence = fieldErrors.evidencias;
    delete fieldErrors.evidencias;
  }

  if (fieldErrors.descricao && !fieldErrors.description) {
    fieldErrors.description = fieldErrors.descricao;
    delete fieldErrors.descricao;
  }

  return {
    ...result,
    fieldErrors,
  };
}

export async function submitChallengeSubmission(
  payload,
  { submitRequest = submitChallengeSubmissionRequest } = {}
) {
  const validation = validateChallengeSubmissionPayload(payload);

  if (!validation.ok) {
    return validation;
  }

  const result = normalizeSubmissionFieldErrors(withApiFieldErrors(await submitRequest(validation.data)));

  if (!result.ok) {
    return result;
  }

  const submission = toChallengeSubmissionResponseDto(result.data);

  return {
    ...result,
    data: submission,
    message: `Desafio enviado com status ${submission.status || "pendente"}.`,
  };
}
