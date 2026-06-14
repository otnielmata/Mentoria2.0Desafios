import { validateLoginPayload, validateRegisterPayload } from "@/models/auth.model";
import { withApiFieldErrors } from "@/models/validation.model";
import { loginUser, registerUser } from "@/services/auth.service";

export async function login(payload) {
  const validation = validateLoginPayload(payload);
  if (!validation.ok) {
    return validation;
  }

  return withApiFieldErrors(await loginUser(validation.data));
}

export async function register(payload) {
  const validation = validateRegisterPayload(payload);
  if (!validation.ok) {
    return validation;
  }

  return withApiFieldErrors(await registerUser(validation.data));
}
