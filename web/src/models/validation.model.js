export function cleanText(value) {
  return String(value || "").trim();
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function createValidationError(message, fieldErrors = {}) {
  return {
    ok: false,
    fieldErrors,
    message,
    type: "validation",
  };
}

export function createValidationSuccess(data) {
  return {
    ok: true,
    data,
  };
}

function getDetailField(detail) {
  return detail?.field || detail?.path || detail?.param || detail?.property || detail?.name || "";
}

function getDetailMessage(detail) {
  return detail?.message || detail?.msg || detail?.error || "Campo invalido.";
}

export function mapApiFieldErrors(details) {
  if (!Array.isArray(details)) {
    return {};
  }

  return details.reduce((errors, detail) => {
    const field = getDetailField(detail);

    if (!field) {
      return errors;
    }

    return {
      ...errors,
      [field]: getDetailMessage(detail),
    };
  }, {});
}

export function withApiFieldErrors(result) {
  if (result.ok) {
    return result;
  }

  const fieldErrors = mapApiFieldErrors(result.details);

  return {
    ...result,
    fieldErrors,
  };
}
