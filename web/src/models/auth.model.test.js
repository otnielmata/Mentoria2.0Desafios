import { describe, expect, it } from "vitest";
import { validateRegisterPayload } from "@/models/auth.model";

describe("validateRegisterPayload", () => {
  it("retorna erros acessiveis por campo quando dados obrigatorios sao invalidos", () => {
    const result = validateRegisterPayload({
      name: "",
      email: "email-invalido",
      password: "123",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Revise os campos destacados antes de continuar.");
    expect(result.fieldErrors).toEqual({
      name: "Informe um nome com pelo menos 2 caracteres.",
      email: "Informe um e-mail valido.",
      password: "A senha deve ter pelo menos 6 caracteres.",
    });
  });

  it("normaliza nome e e-mail quando os dados sao validos", () => {
    const result = validateRegisterPayload({
      name: "  Maria Silva  ",
      email: "  MARIA@EXEMPLO.COM  ",
      password: "senha123",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        name: "Maria Silva",
        email: "maria@exemplo.com",
        password: "senha123",
      },
    });
  });
});
