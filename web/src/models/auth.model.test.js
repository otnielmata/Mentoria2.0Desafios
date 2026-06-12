import { describe, expect, it } from "vitest";
import { validateLoginPayload } from "@/models/auth.model";

describe("validateLoginPayload", () => {
  it("retorna erros acessiveis por campo quando e-mail e senha sao invalidos", () => {
    const result = validateLoginPayload({
      email: "email-invalido",
      password: "123",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Revise os campos destacados antes de continuar.");
    expect(result.fieldErrors).toEqual({
      email: "Informe um e-mail valido.",
      password: "Informe a senha com pelo menos 6 caracteres.",
    });
  });

  it("normaliza e-mail quando os dados sao validos", () => {
    const result = validateLoginPayload({
      email: "  ALUNO@EXEMPLO.COM  ",
      password: "senha123",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        email: "aluno@exemplo.com",
        password: "senha123",
      },
    });
  });
});
