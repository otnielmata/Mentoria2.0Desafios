const { API_BASE_PATH } = require("../contracts/api-endpoints");

const ENDPOINT_UNAVAILABLE_CODE = "ENDPOINT_UNAVAILABLE";
const ENDPOINT_UNAVAILABLE_MESSAGE = "Funcionalidade indisponível no momento. Tente novamente mais tarde.";
const API_CONNECTION_ERROR_CODE = "API_CONNECTION_ERROR";
const API_CONNECTION_ERROR_MESSAGE = "Não foi possível conectar à API. Aguarde alguns segundos e tente atualizar a tela.";
const MUTATION_METHODS = ["POST", "PATCH", "PUT", "DELETE"];

class ApiClientError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status || 0;
    this.code = options.code || "REQUEST_ERROR";
    this.details = options.details || null;
    this.endpoint = options.endpoint || null;
    this.shouldClearSession = options.shouldClearSession === true;
    this.isEndpointUnavailable = this.code === ENDPOINT_UNAVAILABLE_CODE;
  }
}

function normalizeBaseUrl(baseUrl = "") {
  return String(baseUrl || "").replace(/\/+$/, "");
}

function normalizePath(path = "") {
  const value = String(path || "");
  return value.startsWith("/") ? value : `/${value}`;
}

function getEndpointPath(endpoint) {
  if (typeof endpoint === "string") return endpoint;
  return endpoint.path;
}

function buildUrl(baseUrl, endpoint) {
  const path = normalizePath(getEndpointPath(endpoint));
  const apiPath = path.startsWith(`${API_BASE_PATH}/`) ? path : `${API_BASE_PATH}${path}`;
  return `${normalizeBaseUrl(baseUrl)}${apiPath}`;
}

async function parseBody(response) {
  const contentType = response.headers && response.headers.get ? response.headers.get("content-type") : "";
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  const text = response.text ? await response.text() : "";
  return text ? { message: text } : null;
}

function createApiClient(options = {}) {
  const {
    baseUrl = "",
    fetchImpl = globalThis.fetch,
    getToken = () => null,
    onUnauthorized = () => {},
    onMutationSuccess = () => {},
    retryDelayMs = 250,
  } = options;

  if (typeof fetchImpl !== "function") {
    throw new Error("fetchImpl é obrigatório para criar o cliente da API.");
  }

  async function request(endpoint, requestOptions = {}) {
    const method = String(requestOptions.method || (typeof endpoint === "object" ? endpoint.method : "GET") || "GET").toUpperCase();
    const token = getToken();
    const headers = {
      Accept: "application/json",
      ...(requestOptions.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(requestOptions.headers || {}),
    };
    const url = buildUrl(baseUrl, endpoint);
    const fetchOptions = {
      ...requestOptions,
      method,
      headers,
      body: requestOptions.body && typeof requestOptions.body !== "string" ? JSON.stringify(requestOptions.body) : requestOptions.body,
    };
    let response;
    try {
      response = await fetchImpl(url, fetchOptions);
    } catch (networkError) {
      if (method === "GET") {
        if (retryDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        try {
          response = await fetchImpl(url, fetchOptions);
        } catch {
          throw new ApiClientError(API_CONNECTION_ERROR_MESSAGE, {
            status: 0,
            code: API_CONNECTION_ERROR_CODE,
            endpoint: getEndpointPath(endpoint),
          });
        }
      } else {
        throw new ApiClientError(API_CONNECTION_ERROR_MESSAGE, {
          status: 0,
          code: API_CONNECTION_ERROR_CODE,
          endpoint: getEndpointPath(endpoint),
        });
      }
    }
    const body = await parseBody(response);

    if (response.status === 404) {
      throw new ApiClientError((body && body.message) || ENDPOINT_UNAVAILABLE_MESSAGE, {
        status: 404,
        code: ENDPOINT_UNAVAILABLE_CODE,
        endpoint: getEndpointPath(endpoint),
        details: body && body.details,
        shouldClearSession: false,
      });
    }

    if (response.status === 401) {
      onUnauthorized({ endpoint: getEndpointPath(endpoint), status: response.status });
      throw new ApiClientError((body && body.message) || "Sessão expirada. Faça login novamente.", {
        status: 401,
        code: (body && body.code) || "UNAUTHORIZED",
        endpoint: getEndpointPath(endpoint),
        details: body && body.details,
        shouldClearSession: true,
      });
    }

    if (!response.ok) {
      throw new ApiClientError((body && body.message) || "Não foi possível concluir a solicitação.", {
        status: response.status,
        code: (body && body.code) || "REQUEST_ERROR",
        endpoint: getEndpointPath(endpoint),
        details: body && body.details,
      });
    }

    if (MUTATION_METHODS.includes(method)) {
      onMutationSuccess({ endpoint: getEndpointPath(endpoint), method, result: body });
    }

    return body;
  }

  return { request };
}

module.exports = {
  ApiClientError,
  API_CONNECTION_ERROR_CODE,
  API_CONNECTION_ERROR_MESSAGE,
  ENDPOINT_UNAVAILABLE_CODE,
  ENDPOINT_UNAVAILABLE_MESSAGE,
  buildUrl,
  createApiClient,
};
