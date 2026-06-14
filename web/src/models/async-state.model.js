export const asyncStates = Object.freeze({
  idle: "idle",
  loading: "loading",
  success: "success",
  empty: "empty",
  error: "error",
});

const defaultMessages = {
  empty: "Nenhum registro encontrado.",
  error: "Nao foi possivel carregar as informacoes.",
  loading: "Carregando informacoes...",
};

function normalizeState(state) {
  return Object.values(asyncStates).includes(state) ? state : asyncStates.idle;
}

function hasItems(data) {
  if (Array.isArray(data)) {
    return data.length > 0;
  }

  return Boolean(data);
}

export function createAsyncState({
  canRetry = false,
  data = null,
  message = "",
  state = asyncStates.idle,
  type = "",
} = {}) {
  const normalizedState = normalizeState(state);

  return {
    canRetry: Boolean(canRetry),
    data,
    isEmpty: normalizedState === asyncStates.empty,
    isError: normalizedState === asyncStates.error,
    isLoading: normalizedState === asyncStates.loading,
    isSuccess: normalizedState === asyncStates.success,
    message,
    state: normalizedState,
    type,
  };
}

export function createLoadingAsyncState(message = defaultMessages.loading) {
  return createAsyncState({
    message,
    state: asyncStates.loading,
  });
}

export function createEmptyAsyncState(message = defaultMessages.empty) {
  return createAsyncState({
    message,
    state: asyncStates.empty,
  });
}

export function createSuccessAsyncState(data) {
  return createAsyncState({
    data,
    state: asyncStates.success,
  });
}

export function getSafeAsyncErrorMessage(result = {}, fallbackMessage = defaultMessages.error) {
  if (result.type === "network") {
    return "A API REST nao respondeu. Verifique a conexao e tente novamente.";
  }

  if (result.type === "unauthorized") {
    return "Sua sessao expirou. Faca login novamente.";
  }

  return result.message || fallbackMessage;
}

export function createErrorAsyncState(result = {}, options = {}) {
  return createAsyncState({
    canRetry: options.canRetry ?? result.type !== "unauthorized",
    message: getSafeAsyncErrorMessage(result, options.fallbackMessage),
    state: asyncStates.error,
    type: result.type || "error",
  });
}

export function createAsyncStateFromResult(result = {}, options = {}) {
  if (!result.ok) {
    return createErrorAsyncState(result, options);
  }

  if (!hasItems(result.data)) {
    return createEmptyAsyncState(options.emptyMessage);
  }

  return createSuccessAsyncState(result.data);
}
