import { apiRequest } from "@/services/api/client";
import { saveSession } from "@/services/session.service";

async function authenticate(path, payload) {
  const result = await apiRequest(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (result.ok) {
    saveSession(result.data);
  }

  return result;
}

export function loginUser(payload) {
  return authenticate("/api/auth/login", payload);
}

export function registerUser(payload) {
  return authenticate("/api/auth/register", payload);
}
