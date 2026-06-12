import { apiRequest } from "@/services/api/client";
import { saveSession } from "@/services/session.service";

const INVALID_CREDENTIALS_MESSAGE = "Credenciais invalidas. Verifique seus dados e tente novamente.";

async function authenticate(path, payload) {
  const result = await apiRequest(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (result.ok && result.data?.token) {
    saveSession(result.data);
  }

  return result;
}

export function loginUser(payload) {
  return authenticate("/api/usuarios/login", payload).then((result) => {
    if (!result.ok && result.status) {
      return {
        ...result,
        message: INVALID_CREDENTIALS_MESSAGE,
      };
    }

    return result;
  });
}

export function registerUser(payload) {
  return authenticate("/api/auth/register", payload);
}
