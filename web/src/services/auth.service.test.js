import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginUser } from "@/services/auth.service";
import { apiRequest } from "@/services/api/client";
import { saveSession } from "@/services/session.service";

vi.mock("@/services/api/client", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@/services/session.service", () => ({
  saveSession: vi.fn(),
}));

describe("auth.service loginUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa exclusivamente o endpoint POST /api/usuarios/login", async () => {
    const payload = {
      email: "aluno@example.com",
      password: "senha123",
    };

    apiRequest.mockResolvedValue({
      ok: true,
      data: {
        token: "jwt-token",
        user: { id: "1", name: "Aluno", email: "aluno@example.com" },
      },
    });

    await loginUser(payload);

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith("/api/usuarios/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  });

  it("salva sessao quando a API retorna token", async () => {
    const response = {
      ok: true,
      data: {
        token: "jwt-token",
        user: { id: "1", name: "Aluno", email: "aluno@example.com" },
      },
    };

    apiRequest.mockResolvedValue(response);

    await loginUser({
      email: "aluno@example.com",
      password: "senha123",
    });

    expect(saveSession).toHaveBeenCalledWith(response.data);
  });

  it("retorna mensagem generica em falhas de autenticacao da API", async () => {
    apiRequest.mockResolvedValue({
      ok: false,
      status: 401,
      message: "Senha incorreta.",
    });

    const result = await loginUser({
      email: "aluno@example.com",
      password: "senha123",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Credenciais invalidas. Verifique seus dados e tente novamente.");
    expect(saveSession).not.toHaveBeenCalled();
  });

  it("nao salva sessao quando a resposta de sucesso nao contem token", async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      data: { user: { id: "1" } },
    });

    await loginUser({
      email: "aluno@example.com",
      password: "senha123",
    });

    expect(saveSession).not.toHaveBeenCalled();
  });
});
