import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function getMyChallengeSubmissionsRequest(requester = apiRequest) {
  return requester(apiEndpoints.challengeSubmissions.mine);
}
