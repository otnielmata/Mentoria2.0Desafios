import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function submitChallengeSubmissionRequest(payload, requester = apiRequest) {
  return requester(apiEndpoints.challengeSubmissions.create, {
    method: "POST",
    payload,
  });
}
