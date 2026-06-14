import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function listChallengeApprovalsRequest(requester = apiRequest) {
  return requester(apiEndpoints.challengeSubmissions.approvals);
}

export function reviewChallengeApprovalRequest(payload, requester = apiRequest) {
  return requester(apiEndpoints.challengeSubmissions.approvals, {
    method: "PATCH",
    payload,
  });
}
