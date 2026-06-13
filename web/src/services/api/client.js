import { getApiBaseUrl } from "@/config/env";
import { getToken } from "@/services/session.service";

function buildUrl(apiBaseUrl, path) {
  return `${apiBaseUrl}${path}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    return {
      ok: false,
      message: payload?.message || "Nao foi possivel concluir a solicitacao.",
      status: response.status,
    };
  }

  return {
    ok: true,
    data: payload,
    status: response.status,
  };
}

export async function apiRequest(path, options = {}) {
  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    return {
      ok: false,
      message: "Configure NEXT_PUBLIC_API_BASE_URL para conectar a API REST.",
      status: 0,
    };
  }

  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(buildUrl(apiBaseUrl, path), {
      ...options,
      headers,
    });

    return parseResponse(response);
  } catch (error) {
    return {
      ok: false,
      message: "A API REST nao respondeu. Verifique se o backend esta iniciado.",
      error,
    };
  }
}
