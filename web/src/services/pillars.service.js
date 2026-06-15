import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function listPillarsRequest(requester = apiRequest) {
  return requester(apiEndpoints.pillars.collection);
}
