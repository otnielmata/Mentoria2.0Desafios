import { validateLoginPayload, validateRegisterPayload } from "@/models/auth.model";
import { loginUser, registerUser } from "@/services/auth.service";

export async function login(payload) {
  const validation = validateLoginPayload(payload);
  if (!validation.ok) {
    return validation;
  }

  return loginUser(validation.data);
}

export async function register(payload) {
  const validation = validateRegisterPayload(payload);
  if (!validation.ok) {
    return validation;
  }

  return registerUser(validation.data);
}
