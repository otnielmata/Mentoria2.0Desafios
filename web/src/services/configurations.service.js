import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function getConfigurationsRequest(requester = apiRequest) {
  return requester(apiEndpoints.configurations.collection);
}
