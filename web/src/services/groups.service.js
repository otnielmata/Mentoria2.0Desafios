import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function listGroupsRequest(requester = apiRequest) {
  return requester(apiEndpoints.groups.collection);
}

export function listMyGroupsRequest(requester = apiRequest) {
  return requester(apiEndpoints.groups.mine);
}
