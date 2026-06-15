import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

export function listUsersRequest(requester = apiRequest) {
  return requester(apiEndpoints.users.collection);
}

export function createUserRequest(payload, requester = apiRequest) {
  return requester(apiEndpoints.users.collection, {
    method: "POST",
    payload,
  });
}
