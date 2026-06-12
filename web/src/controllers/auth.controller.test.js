import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "@/controllers/auth.controller";
import { loginUser } from "@/services/auth.service";

vi.mock("@/services/auth.service", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

describe("auth.controller login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("impede envio para a API quando o formulario esta invalido", async () => {
    const result = await login({
      email: "sem-email",
      password: "123",
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toHaveProperty("email");
    expect(loginUser).not.toHaveBeenCalled();
  });

  it("envia somente dados normalizados ao service quando o formulario esta valido", async () => {
    loginUser.mockResolvedValue({
      ok: true,
      data: { token: "token-jwt" },
    });

    const result = await login({
      email: "  ALUNO@EXEMPLO.COM ",
      password: "senha123",
    });

    expect(result.ok).toBe(true);
    expect(loginUser).toHaveBeenCalledWith({
      email: "aluno@exemplo.com",
      password: "senha123",
    });
  });
});
