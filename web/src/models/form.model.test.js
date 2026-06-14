import { describe, expect, it } from "vitest";
import {
  clearSensitiveValues,
  createErrorFormStatus,
  createLoadingFormStatus,
  createStatusAfterFieldChange,
  createStatusFromResult,
  formStates,
  mergeFieldValue,
} from "@/models/form.model";

describe("models/form", () => {
  it("padroniza estados visiveis do formulario", () => {
    expect(createLoadingFormStatus()).toMatchObject({
      fieldErrors: {},
      message: "",
      state: formStates.loading,
      type: "",
    });
    expect(createErrorFormStatus("Dados invalidos.", { email: "E-mail invalido." })).toMatchObject({
      fieldErrors: { email: "E-mail invalido." },
      message: "Dados invalidos.",
      state: formStates.error,
      type: "error",
    });
  });

  it("converte resultados de controller em feedback de sucesso ou erro", () => {
    expect(createStatusFromResult({ ok: true }, "Registro concluido.")).toMatchObject({
      message: "Registro concluido.",
      state: formStates.success,
      type: "success",
    });
    expect(
      createStatusFromResult({
        ok: false,
        fieldErrors: { titulo: "Titulo obrigatorio." },
        message: "Corrija os campos.",
      })
    ).toMatchObject({
      fieldErrors: { titulo: "Titulo obrigatorio." },
      message: "Corrija os campos.",
      state: formStates.error,
      type: "error",
    });
  });

  it("atualiza apenas o campo editado e limpa seu erro especifico", () => {
    const values = mergeFieldValue({ email: "antigo@example.com", password: "123456" }, "email", "novo@example.com");
    const status = createStatusAfterFieldChange(
      createErrorFormStatus("Corrija os campos.", {
        email: "E-mail invalido.",
        password: "Senha curta.",
      }),
      "email"
    );

    expect(values).toEqual({ email: "novo@example.com", password: "123456" });
    expect(status).toMatchObject({
      fieldErrors: { password: "Senha curta." },
      message: "Corrija os campos.",
      state: formStates.error,
    });
  });

  it("preserva dados nao sensiveis ao limpar campos sensiveis", () => {
    expect(
      clearSensitiveValues(
        { email: "aluno@example.com", name: "Aluno", password: "segredo" },
        ["password"]
      )
    ).toEqual({
      email: "aluno@example.com",
      name: "Aluno",
      password: "",
    });
  });
});
