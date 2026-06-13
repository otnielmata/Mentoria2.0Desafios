import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "@/services/api/client";

describe("api/client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("falha sem chamar fetch quando a URL base da API nao esta configurada", async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    const result = await apiRequest("/api/health");

    expect(result).toEqual({
      ok: false,
      message: "Configure NEXT_PUBLIC_API_BASE_URL para conectar a API REST.",
      status: 0,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("monta a URL a partir da variavel de ambiente", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.exemplo.com";
    fetch.mockResolvedValue({
      headers: {
        get: () => "application/json",
      },
      json: async () => ({ status: "ok" }),
      ok: true,
      status: 200,
    });

    const result = await apiRequest("/api/health");

    expect(fetch).toHaveBeenCalledWith("https://api.exemplo.com/api/health", {
      headers: {
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual({
      ok: true,
      data: { status: "ok" },
      status: 200,
    });
  });
});
