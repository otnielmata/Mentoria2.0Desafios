function cleanText(value) {
  return String(value || "").trim();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasErrors(fieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

export function validateLoginPayload(payload) {
  const email = cleanText(payload?.email).toLowerCase();
  const password = cleanText(payload?.password);
  const fieldErrors = {};

  if (!isEmail(email)) {
    fieldErrors.email = "Informe um e-mail valido.";
  }

  if (password.length < 6) {
    fieldErrors.password = "Informe a senha com pelo menos 6 caracteres.";
  }

  if (hasErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Revise os campos destacados antes de continuar.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: { email, password },
  };
}

export function validateRegisterPayload(payload) {
  const name = cleanText(payload?.name);
  const loginValidation = validateLoginPayload(payload);

  if (name.length < 2) {
    return { ok: false, message: "Informe um nome com pelo menos 2 caracteres." };
  }

  if (!loginValidation.ok) {
    return loginValidation;
  }

  return {
    ok: true,
    data: {
      name,
      ...loginValidation.data,
    },
  };
}
