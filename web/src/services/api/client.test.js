import { describe, expect, it, vi } from "vitest";
import {
  API_BASE_URL,
  apiErrorTypes,
  buildApiUrl,
  createApiClient,
} from "@/services/api/client";
import { apiEndpoints } from "@/services/api/endpoints";

function jsonResponse(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("services/api/client", () => {
  const protectedEndpoint = "/api/desafios";

  it("usa URL base publica normalizada por configuracao", () => {
    expect(API_BASE_URL).toMatch(/^https?:\/\//);
    expect(API_BASE_URL.endsWith("/")).toBe(false);
  });

  it("monta URL usando base configuravel sem codificar endpoint no componente", () => {
    expect(buildApiUrl(apiEndpoints.auth.login, "https://api.example.com/")).toBe(
      "https://api.example.com/api/auth/login"
    );
  });

  it("envia token em chamadas autenticadas", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, { status: 200 }));
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      tokenProvider: () => "token-jwt",
    });

    await client.request(protectedEndpoint);

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.example.com/api/desafios",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer token-jwt",
        }),
      })
    );
  });

  it("permite chamadas publicas sem header de autenticacao", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ token: "novo-token" }, { status: 200 }));
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      tokenProvider: () => "token-existente",
    });

    await client.request(apiEndpoints.auth.login, {
      auth: false,
      method: "POST",
      payload: { email: "user@example.com", password: "123456" },
    });

    const [, requestOptions] = fetcher.mock.calls[0];

    expect(requestOptions.headers.Authorization).toBeUndefined();
    expect(requestOptions.headers["Content-Type"]).toBe("application/json");
    expect(requestOptions.body).toBe(JSON.stringify({ email: "user@example.com", password: "123456" }));
  });

  it("padroniza erros de validacao retornados pela API", async () => {
    const logger = { error: vi.fn() };
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          errors: [{ field: "email", message: "E-mail invalido" }],
          message: "Dados invalidos com token=abc.",
        },
        { status: 422 }
      )
    );
    const client = createApiClient({ baseUrl: "https://api.example.com", fetcher, logger });

    const result = await client.request(apiEndpoints.auth.register, { auth: false, method: "POST" });

    expect(result).toEqual({
      ok: false,
      code: apiErrorTypes.validation,
      details: [{ field: "email", message: "E-mail invalido" }],
      message: "Dados invalidos com token=[redacted]",
      status: 422,
      type: apiErrorTypes.validation,
    });
    expect(logger.error).toHaveBeenCalledWith("api.error", {
      endpoint: "/api/auth/register",
      message: "Dados invalidos com token=[redacted]",
      method: "POST",
      status: 422,
      type: apiErrorTypes.validation,
    });
  });

  it("diferencia erro de rede de erro de validacao", async () => {
    const logger = { error: vi.fn() };
    const error = new Error("offline Bearer abc");
    const fetcher = vi.fn().mockRejectedValue(error);
    const client = createApiClient({ baseUrl: "https://api.example.com", fetcher, logger });

    const result = await client.request(protectedEndpoint);

    expect(result.ok).toBe(false);
    expect(result.type).toBe(apiErrorTypes.network);
    expect(result.status).toBe(0);
    expect(result.error).toBe(error);
    expect(logger.error).toHaveBeenCalledWith("api.network_error", {
      endpoint: "/api/desafios",
      error: {
        message: "offline Bearer [redacted]",
        name: "Error",
      },
      message: "A API REST nao respondeu. Verifique se o backend esta iniciado.",
      method: "GET",
      status: 0,
      type: apiErrorTypes.network,
    });
  });

  it("limpa sessao quando chamada protegida retorna nao autorizado", async () => {
    const unauthorizedHandler = vi.fn();
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ message: "Token invalido." }, { status: 401 }));
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetcher,
      tokenProvider: () => "token-expirado",
      unauthorizedHandler,
    });

    const result = await client.request(protectedEndpoint);

    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.type).toBe(apiErrorTypes.unauthorized);
    expect(result.message).toBe("Sessao expirada ou invalida. Faca login novamente.");
  });
});
