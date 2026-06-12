import { beforeEach, describe, expect, it, vi } from "vitest";
import { register } from "@/controllers/auth.controller";
import { registerUser } from "@/services/auth.service";

vi.mock("@/services/auth.service", () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

describe("auth.controller register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("impede envio para a API quando o formulario esta invalido", async () => {
    const result = await register({
      name: "",
      email: "sem-email",
      password: "123",
    });

    expect(result.ok).toBe(false);
    expect(result.fieldErrors).toHaveProperty("name");
    expect(registerUser).not.toHaveBeenCalled();
  });

  it("envia somente dados normalizados ao service quando o formulario esta valido", async () => {
    registerUser.mockResolvedValue({
      ok: true,
      data: { token: "token-jwt" },
    });

    const result = await register({
      name: "  Joao Souza  ",
      email: "  JOAO@EXEMPLO.COM ",
      password: "senha123",
    });

    expect(result.ok).toBe(true);
    expect(registerUser).toHaveBeenCalledWith({
      name: "Joao Souza",
      email: "joao@exemplo.com",
      password: "senha123",
    });
  });
});
