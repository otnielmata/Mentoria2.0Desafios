import {
  toChallengeApprovalsDto,
  validateApprovalReviewPayload,
} from "@/models/challenge-approvals.model";
import { withApiFieldErrors } from "@/models/validation.model";
import {
  listChallengeApprovalsRequest,
  reviewChallengeApprovalRequest,
} from "@/services/challenge-approvals.service";

function normalizeApprovalFieldErrors(result) {
  const fieldErrors = { ...(result.fieldErrors || {}) };
  const aliases = {
    acao: "action",
    envio_desafio_id: "submissionId",
    envioDesafioId: "submissionId",
    feedback_admin: "feedback",
    status: "action",
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

function getReviewMessage(status) {
  if (status === "aprovado") {
    return "Envio aprovado com sucesso. A API atribuira os pontos automaticamente.";
  }

  if (status === "reprovado") {
    return "Envio reprovado com sucesso.";
  }

  return "Ajuste solicitado com sucesso.";
}

export async function getChallengeApprovals({
  requestApprovals = listChallengeApprovalsRequest,
} = {}) {
  const result = await requestApprovals();

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    data: toChallengeApprovalsDto(result.data),
  };
}

export async function reviewChallengeApproval(
  payload,
  { requestReviewApproval = reviewChallengeApprovalRequest } = {}
) {
  const validation = validateApprovalReviewPayload(payload);

  if (!validation.ok) {
    return validation;
  }

  const result = normalizeApprovalFieldErrors(
    withApiFieldErrors(await requestReviewApproval(validation.data))
  );

  if (!result.ok) {
    return result;
  }

  return {
    ...result,
    message: getReviewMessage(validation.data.status),
  };
}
