export const formStates = Object.freeze({
  idle: "idle",
  loading: "loading",
  success: "success",
  error: "error",
});

const visibleStatusTypes = {
  [formStates.error]: "error",
  [formStates.success]: "success",
};

function normalizeState(state) {
  return Object.values(formStates).includes(state) ? state : formStates.idle;
}

export function createFormStatus({ fieldErrors = {}, message = "", state = formStates.idle } = {}) {
  const normalizedState = normalizeState(state);

  return {
    fieldErrors: fieldErrors || {},
    message: message || "",
    state: normalizedState,
    type: visibleStatusTypes[normalizedState] || "",
  };
}

export function createIdleFormStatus() {
  return createFormStatus();
}

export function createLoadingFormStatus(message = "") {
  return createFormStatus({ message, state: formStates.loading });
}

export function createSuccessFormStatus(message = "") {
  return createFormStatus({ message, state: formStates.success });
}

export function createErrorFormStatus(message = "Nao foi possivel concluir.", fieldErrors = {}) {
  return createFormStatus({
    fieldErrors,
    message,
    state: formStates.error,
  });
}

export function createStatusFromResult(result = {}, successMessage = "") {
  if (result.ok) {
    return createSuccessFormStatus(result.message || successMessage);
  }

  return createErrorFormStatus(result.message, result.fieldErrors || {});
}

export function getEventField(event = {}) {
  const target = event.target || {};

  return {
    name: target.name || "",
    value: target.value ?? "",
  };
}

export function mergeFieldValue(values = {}, fieldName = "", fieldValue = "") {
  if (!fieldName) {
    return values;
  }

  return {
    ...values,
    [fieldName]: fieldValue,
  };
}

export function clearSensitiveValues(values = {}, sensitiveFields = []) {
  return sensitiveFields.reduce(
    (current, fieldName) =>
      Object.prototype.hasOwnProperty.call(current, fieldName)
        ? { ...current, [fieldName]: "" }
        : current,
    values
  );
}

export function createStatusAfterFieldChange(status = createIdleFormStatus(), fieldName = "") {
  const fieldErrors = { ...(status.fieldErrors || {}) };

  if (fieldName) {
    delete fieldErrors[fieldName];
  }

  const hasRemainingErrors = Object.values(fieldErrors).some(Boolean);

  return createFormStatus({
    fieldErrors,
    message: hasRemainingErrors ? status.message : "",
    state: hasRemainingErrors ? formStates.error : formStates.idle,
  });
}
