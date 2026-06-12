import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "@/services/auth.service";
import { apiRequest } from "@/services/api/client";
import { saveSession } from "@/services/session.service";

vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/services/session.service", () => ({
  saveSession: vi.fn(),
}));

describe("auth.service registerUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa exclusivamente o endpoint POST /api/usuarios/registro", async () => {
    const payload = {
      name: "Ana Costa",
      email: "ana@example.com",
      password: "senha123",
    };

    apiRequest.mockResolvedValue({
      ok: true,
      data: {
        token: "jwt-token",
        user: { id: "1", name: "Ana Costa", email: "ana@example.com" },
      },
    });

    await registerUser(payload);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/api/usuarios/registro", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("inicia sessao somente quando a API retorna token", async () => {
    const payload = {
      name: "Ana Costa",
      email: "ana@example.com",
      password: "senha123",
    };

    apiRequest.mockResolvedValue({
      ok: true,
      data: { user: { id: "1" } },
    });

    await registerUser(payload);

    expect(saveSession).not.toHaveBeenCalled();
  });

  it("salva a sessao quando o cadastro retorna token", async () => {
    const payload = {
      name: "Ana Costa",
      email: "ana@example.com",
      password: "senha123",
    };
    const response = {
      ok: true,
      data: {
        token: "jwt-token",
        user: { id: "1", name: "Ana Costa", email: "ana@example.com" },
      },
    };

    apiRequest.mockResolvedValue(response);

    await registerUser(payload);

    expect(saveSession).toHaveBeenCalledWith(response.data);
  });
});
