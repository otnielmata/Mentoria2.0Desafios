import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function getProfileRequest(requester = apiRequest) {
  return requester(apiEndpoints.users.me);
}
