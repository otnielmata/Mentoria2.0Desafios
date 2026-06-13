import { describe, expect, it } from "vitest";
import { ENV_KEYS, getApiBaseUrl, isApiBaseUrlConfigured } from "@/config/env";

describe("config/env", () => {
  it("le a URL base da API pela variavel publica de ambiente", () => {
    const env = {
      [ENV_KEYS.apiBaseUrl]: "  https://api.exemplo.com  ",
    };

    expect(getApiBaseUrl(env)).toBe("https://api.exemplo.com");
    expect(isApiBaseUrlConfigured(env)).toBe(true);
  });

  it("nao depende de URL fixa quando a variavel nao esta configurada", () => {
    expect(getApiBaseUrl({})).toBe("");
    expect(isApiBaseUrlConfigured({})).toBe(false);
  });
});
