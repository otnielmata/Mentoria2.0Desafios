import { apiRequest } from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";
import { toAuthResponseDto } from "@/models/auth.model";
import { saveSession } from "@/services/session.service";

async function authenticate(path, payload) {
  const result = await apiRequest(path, {
    auth: false,
    method: "POST",
    payload,
  });

  if (result.ok) {
    const session = saveSession(toAuthResponseDto(result.data));
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
