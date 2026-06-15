import { describe, expect, it } from "vitest";
import {
  defaultPublicEnv,
  getPublicEnv,
  isPublicEnvKey,
  looksLikeSecretKey,
  normalizeApiBaseUrl,
} from "@/config/env";

describe("config/env", () => {
  it("normaliza URL publica da API sem barra final", () => {
    expect(normalizeApiBaseUrl("https://api.example.com///")).toBe("https://api.example.com");
  });

  it("usa fallback local apenas para desenvolvimento", () => {
    expect(getPublicEnv({})).toMatchObject({
      apiBaseUrl: defaultPublicEnv.apiBaseUrl,
      appEnv: defaultPublicEnv.appEnv,
    });
  });

  it("identifica variaveis publicas e nomes que parecem segredo", () => {
    expect(isPublicEnvKey("NEXT_PUBLIC_API_BASE_URL")).toBe(true);
    expect(looksLikeSecretKey("NEXT_PUBLIC_JWT_SECRET")).toBe(true);
    expect(looksLikeSecretKey("NEXT_PUBLIC_API_BASE_URL")).toBe(false);
  });
});
