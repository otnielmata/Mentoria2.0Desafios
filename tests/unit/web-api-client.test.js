const {
  ApiClientError,
  ENDPOINT_UNAVAILABLE_CODE,
  ENDPOINT_UNAVAILABLE_MESSAGE,
  buildUrl,
  createApiClient,
} = require("../../web/src/lib/api-client");

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => "application/json",
    },
    json: jest.fn().mockResolvedValue(body),
  };
}

describe("web api client MR-97", () => {
  it("monta URL usando o prefixo /api", () => {
    expect(buildUrl("http://localhost:3000", { path: "/ranking" })).toBe("http://localhost:3000/api/ranking");
    expect(buildUrl("http://localhost:3000/", "/api/health")).toBe("http://localhost:3000/api/health");
  });

  it("trata 404 como funcionalidade indisponível sem limpar sessão", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(404, { message: ENDPOINT_UNAVAILABLE_MESSAGE }));
    const onUnauthorized = jest.fn();
    const client = createApiClient({ fetchImpl, getToken: () => "jwt-token", onUnauthorized });

    await expect(client.request({ method: "GET", path: "/rota-inexistente" })).rejects.toMatchObject({
      name: "ApiClientError",
      status: 404,
      code: ENDPOINT_UNAVAILABLE_CODE,
      isEndpointUnavailable: true,
      shouldClearSession: false,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("trata 401 como expiração/autenticação e permite limpar sessão", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(401, { message: "Token inválido ou expirado." }));
    const onUnauthorized = jest.fn();
    const client = createApiClient({ fetchImpl, onUnauthorized });

    await expect(client.request({ method: "GET", path: "/me" })).rejects.toMatchObject({
      status: 401,
      shouldClearSession: true,
    });
    expect(onUnauthorized).toHaveBeenCalledWith({ endpoint: "/me", status: 401 });
  });

  it("envia token e corpo JSON sem calcular regra de negócio no cliente", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    const client = createApiClient({ fetchImpl, getToken: () => "token" });

    const result = await client.request({ method: "POST", path: "/envios-desafios" }, { body: { descricao: "feito" } });

    expect(result).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/envios-desafios",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ descricao: "feito" }),
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("expõe erro padronizado para outras falhas da API", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(409, { message: "Conflito", code: "CONFLICT" }));
    const client = createApiClient({ fetchImpl });

    await expect(client.request({ method: "PATCH", path: "/envios-desafios/aprovacoes" })).rejects.toBeInstanceOf(ApiClientError);
    await expect(client.request({ method: "PATCH", path: "/envios-desafios/aprovacoes" })).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });
});
