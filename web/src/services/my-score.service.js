import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function getMyScoreRequest(requester = apiRequest) {
  return requester(apiEndpoints.scores.mine);
}
