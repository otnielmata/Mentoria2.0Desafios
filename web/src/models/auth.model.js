import {
  cleanText,
  createValidationError,
  createValidationSuccess,
  isEmail,
} from "@/models/validation.model";

export const authRoles = Object.freeze(["aluno", "professor", "admin"]);
export const authStatuses = Object.freeze(["ativo", "inativo"]);

export function toLoginRequestDto(payload = {}) {
  return {
    email: cleanText(payload.email).toLowerCase(),
    password: cleanText(payload.password),
  };
}

export function toRegisterRequestDto(payload = {}) {
  return {
    name: cleanText(payload.name),
    ...toLoginRequestDto(payload),
  };
}

export function toAuthUserDto(user = {}) {
  const { _id, email, id, name, role, status } = user;

  return Object.fromEntries(
    Object.entries({
      _id,
      email,
      id,
      name,
      role,
      status,
    }).filter(([, value]) => value !== undefined && value !== null)
  );
}

export function toAuthResponseDto(response = {}) {
  return {
    token: response.token || response.accessToken || "",
    user: toAuthUserDto(response.user || response.usuario || response.aluno || {}),
  };
}

export function hasCompleteAuthUser(user = {}) {
  return authRoles.includes(user.role) && authStatuses.includes(user.status);
}

export function hasCompleteAuthResponse(response = {}) {
  const dto = toAuthResponseDto(response);

  return Boolean(dto.token && hasCompleteAuthUser(dto.user));
}

export function validateLoginPayload(payload) {
  const dto = toLoginRequestDto(payload);

  if (!isEmail(dto.email)) {
    return createValidationError("Informe um e-mail valido.", {
      email: "Informe um e-mail valido.",
    });
  }

  if (dto.password.length < 6) {
    return createValidationError("A senha deve ter pelo menos 6 caracteres.", {
      password: "A senha deve ter pelo menos 6 caracteres.",
    });
  }

  return createValidationSuccess(dto);
}

export function validateRegisterPayload(payload) {
  const dto = toRegisterRequestDto(payload);

  if (dto.name.length < 2) {
    return createValidationError("Informe um nome com pelo menos 2 caracteres.", {
      name: "Informe um nome com pelo menos 2 caracteres.",
    });
  }

  const loginValidation = validateLoginPayload(dto);

  if (!loginValidation.ok) {
    return loginValidation;
  }

  return createValidationSuccess(dto);
}
