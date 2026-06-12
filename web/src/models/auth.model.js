function cleanText(value) {
  return String(value || "").trim();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateLoginPayload(payload) {
  const email = cleanText(payload.email).toLowerCase();
  const password = cleanText(payload.password);

  if (!isEmail(email)) {
    return { ok: false, message: "Informe um e-mail valido." };
  }

  if (password.length < 6) {
    return { ok: false, message: "A senha deve ter pelo menos 6 caracteres." };
  }

  return {
    ok: true,
    data: { email, password },
  };
}

export function validateRegisterPayload(payload) {
  const name = cleanText(payload.name);
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
