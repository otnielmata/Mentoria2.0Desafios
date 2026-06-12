import { apiRequest } from "@/services/api/client";

export function listHeuristicsRequest() {
  return apiRequest("/api/heuristicas");
}

export function createHeuristicRequest(payload) {
  return apiRequest("/api/heuristicas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
