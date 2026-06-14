import { describe, expect, it } from "vitest";
import {
  toAuthResponseDto,
  toLoginRequestDto,
  toRegisterRequestDto,
  validateLoginPayload,
  validateRegisterPayload,
} from "@/models/auth.model";

describe("models/auth", () => {
  it("cria DTO de login com email normalizado", () => {
    expect(toLoginRequestDto({ email: " ALUNO@EXAMPLE.COM ", password: " 123456 " })).toEqual({
      email: "aluno@example.com",
      password: "123456",
    });
  });

  it("cria DTO de registro separado do login", () => {
    expect(toRegisterRequestDto({ email: "a@b.com", name: " Ana ", password: "123456" })).toEqual({
      email: "a@b.com",
      name: "Ana",
      password: "123456",
    });
  });

  it("valida login antes da chamada HTTP", () => {
    expect(validateLoginPayload({ email: "invalido", password: "123456" })).toMatchObject({
      ok: false,
      fieldErrors: { email: "Informe um e-mail valido." },
    });
    expect(validateLoginPayload({ email: "aluno@example.com", password: "123456" })).toMatchObject({
      ok: true,
      data: { email: "aluno@example.com", password: "123456" },
    });
  });

  it("valida registro antes da chamada HTTP", () => {
    expect(validateRegisterPayload({ email: "aluno@example.com", name: "A", password: "123456" })).toMatchObject({
      ok: false,
      fieldErrors: { name: "Informe um nome com pelo menos 2 caracteres." },
    });
  });

  it("normaliza resposta autenticada sem manter senha", () => {
    expect(
      toAuthResponseDto({
        token: "token",
        user: {
          email: "aluno@example.com",
          name: "Aluno",
          password: "segredo",
          role: "aluno",
        },
      })
    ).toEqual({
      token: "token",
      user: {
        email: "aluno@example.com",
        name: "Aluno",
        role: "aluno",
      },
    });
  });
});
