import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function listChallengesRequest(requester = apiRequest) {
  return requester(apiEndpoints.challenges.collection);
}

export function createChallengeRequest(payload, requester = apiRequest) {
  return requester(apiEndpoints.challenges.collection, {
    method: "POST",
    payload,
  });
}
