import { describe, expect, it } from "vitest";
import { mapApiFieldErrors, withApiFieldErrors } from "@/models/validation.model";

describe("models/validation", () => {
  it("mapeia detalhes de validacao da API para erros por campo", () => {
    expect(
      mapApiFieldErrors([
        { field: "email", message: "E-mail ja cadastrado." },
        { path: "password", msg: "Senha fraca." },
      ])
    ).toEqual({
      email: "E-mail ja cadastrado.",
      password: "Senha fraca.",
    });
  });

  it("preserva erro original e adiciona fieldErrors", () => {
    expect(
      withApiFieldErrors({
        ok: false,
        details: [{ field: "titulo", message: "Titulo obrigatorio." }],
        message: "Erro de validacao.",
      })
    ).toEqual({
      ok: false,
      details: [{ field: "titulo", message: "Titulo obrigatorio." }],
      fieldErrors: { titulo: "Titulo obrigatorio." },
      message: "Erro de validacao.",
    });
  });
});
