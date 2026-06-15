import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";
import { hasCompleteAuthResponse, toAuthResponseDto } from "@/models/auth.model";
import { saveSession } from "@/services/session.service";

async function authenticate(path, payload) {
  const result = await apiRequest(path, {
    auth: false,
    method: "POST",
    payload,
  });

  if (result.ok) {
    const authResponse = toAuthResponseDto(result.data);

    if (!hasCompleteAuthResponse(authResponse)) {
      return {
        ok: false,
        message: "Sessao invalida. Faca login novamente.",
        status: result.status || 0,
        type: "invalid_session",
      };
    }

    const session = saveSession(authResponse);

    if (!session) {
      return {
        ok: false,
        message: "Sessao invalida. Faca login novamente.",
        status: result.status || 0,
        type: "invalid_session",
      };
    }

    return {
      ...result,
      data: session,
    };
  }

  return result;
}

export function loginUser(payload) {
  return authenticate(apiEndpoints.auth.login, payload);
}

export function registerUser(payload) {
  return authenticate(apiEndpoints.auth.register, payload);
}
