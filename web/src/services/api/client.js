import { publicEnv } from "@/config/env";
import {
  createApiErrorLogContext,
  logger as defaultLogger,
  sanitizeText,
} from "@/services/logger.service";
import { clearSession, getToken } from "@/services/session.service";

export const API_BASE_URL = publicEnv.apiBaseUrl;

export const apiErrorTypes = {
  api: "api",
  unauthorized: "unauthorized",
  network: "network",
  validation: "validation",
};

function normalizeBaseUrl(baseUrl = API_BASE_URL) {
  return baseUrl.replace(/\/+$/, "");
}

function normalizePath(path) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(path, baseUrl = API_BASE_URL) {
  return `${normalizeBaseUrl(baseUrl)}${normalizePath(path)}`;
}

function isJsonResponse(response) {
  return (response.headers.get("content-type") || "").includes("application/json");
}

async function readPayload(response) {
  if (!isJsonResponse(response)) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorMessage(payload, fallback) {
  return sanitizeText(payload?.message || payload?.error || fallback);
}

function getErrorType(status, payload) {
  if (status === 401) {
    return apiErrorTypes.unauthorized;
  }

  if (status === 400 || status === 422 || payload?.errors || payload?.details) {
    return apiErrorTypes.validation;
  }

  return apiErrorTypes.api;
}

export function normalizeApiError({ payload, status }) {
  const type = getErrorType(status, payload);
  const message =
    type === apiErrorTypes.unauthorized
      ? "Sessao expirada ou invalida. Faca login novamente."
      : getErrorMessage(payload, "Nao foi possivel concluir a solicitacao.");

  return {
    ok: false,
    code: payload?.code || type,
    details: payload?.errors || payload?.details || null,
    message,
    status,
    type,
  };
}

export function normalizeNetworkError(error) {
  return {
    ok: false,
    code: apiErrorTypes.network,
    error,
    message: "A API REST nao respondeu. Verifique se o backend esta iniciado.",
    status: 0,
    type: apiErrorTypes.network,
  };
}

function getRequestMethod(requestOptions = {}) {
  return requestOptions.method || "GET";
}

function buildHeaders({ auth, body, headers, token }) {
  const requestHeaders = {
    Accept: "application/json",
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(headers || {}),
  };

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  return requestHeaders;
}

export function createApiClient({
  baseUrl = API_BASE_URL,
  fetcher = fetch,
  logger = defaultLogger,
  tokenProvider = getToken,
  unauthorizedHandler = clearSession,
} = {}) {
  async function request(path, options = {}) {
    const { auth = true, headers, payload, ...requestOptions } = options;
    const body = requestOptions.body ?? (payload ? JSON.stringify(payload) : undefined);
    const method = getRequestMethod(requestOptions);

    try {
      const response = await fetcher(buildApiUrl(path, baseUrl), {
        ...requestOptions,
        body,
        headers: buildHeaders({
          auth,
          body,
          headers,
          token: tokenProvider(),
        }),
      });
      const responsePayload = await readPayload(response);

      if (!response.ok) {
        if (auth && response.status === 401) {
          unauthorizedHandler();
        }

        const result = normalizeApiError({ payload: responsePayload, status: response.status });

        logger.error(
          "api.error",
          createApiErrorLogContext({
            endpoint: path,
            message: result.message,
            method,
            status: result.status,
            type: result.type,
          })
        );

        return result;
      }

      return {
        ok: true,
        data: responsePayload,
        status: response.status,
      };
    } catch (error) {
      const result = normalizeNetworkError(error);

      logger.error(
        "api.network_error",
        createApiErrorLogContext({
          endpoint: path,
          error,
          message: result.message,
          method,
          status: result.status,
          type: result.type,
        })
      );

      return result;
    }
  }

  return { request };
}

const defaultApiClient = createApiClient();

export function apiRequest(path, options = {}) {
  return defaultApiClient.request(path, options);
}
