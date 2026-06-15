import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function listClassesRequest(requester = apiRequest) {
  return requester(apiEndpoints.classes.collection);
}

export function createClassRequest(payload, requester = apiRequest) {
  return requester(apiEndpoints.classes.collection, {
    method: "POST",
    payload,
  });
}
