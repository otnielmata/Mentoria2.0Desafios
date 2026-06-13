import { apiRequest } from "@/services/api/client";
import { getToken } from "@/services/session.service";

export function listHeuristicsRequest() {
  if (!getToken()) {
    return Promise.resolve({
      ok: false,
      message: "Entre na sua conta para visualizar heuristicas.",
      status: 401,
      shouldRedirectToLogin: true,
    });
  }

  return apiRequest("/api/heuristicas");
}

export function createHeuristicRequest(payload) {
  return apiRequest("/api/heuristicas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
