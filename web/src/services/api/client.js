import { getToken } from "@/services/session.service";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

function buildUrl(path) {
  return `${API_BASE_URL}${path}`;
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
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(buildUrl(path), {
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
