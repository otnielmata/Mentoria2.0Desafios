import { describe, expect, it, vi } from "vitest";
import {
  createApiErrorLogContext,
  createLogEvent,
  createLogger,
  redactedValue,
  sanitizeText,
  sanitizeValue,
} from "@/services/logger.service";

describe("services/logger", () => {
  it("remove dados sensiveis de objetos aninhados", () => {
    expect(
      sanitizeValue({
        email: "aluno@example.com",
        headers: {
          Authorization: "Bearer token",
        },
        password: "123456",
        profile: {
          token: "segredo",
        },
      })
    ).toEqual({
      email: "aluno@example.com",
      headers: {
        Authorization: redactedValue,
      },
      password: redactedValue,
      profile: {
        token: redactedValue,
      },
    });
  });

  it("remove segredos embutidos em strings de mensagem", () => {
    expect(sanitizeText("Falha com Bearer abc.def.ghi e token=123")).toBe(
      `Falha com Bearer ${redactedValue} e token=${redactedValue}`
    );
  });

  it("normaliza Error sem expor stack trace", () => {
    const error = new Error("Falha com Bearer abc.def.ghi");

    expect(sanitizeValue(error)).toEqual({
      message: `Falha com Bearer ${redactedValue}`,
      name: "Error",
    });
  });

  it("cria evento de log sanitizado", () => {
    const event = createLogEvent("error", "api.error", {
      endpoint: "/api/auth/login",
      password: "123456",
    });

    expect(event).toMatchObject({
      context: {
        endpoint: "/api/auth/login",
        password: redactedValue,
      },
      event: "api.error",
      level: "error",
    });
    expect(event.timestamp).toEqual(expect.any(String));
  });

  it("usa sink injetavel somente quando habilitado", () => {
    const sink = { error: vi.fn() };
    const logger = createLogger({ enabled: true, sink });

    const event = logger.error("render.error", { token: "segredo" });

    expect(sink.error).toHaveBeenCalledWith("[web:render.error]", {
      token: redactedValue,
    });
    expect(event.context.token).toBe(redactedValue);
  });

  it("monta contexto de falha de API com endpoint, status e mensagem segura", () => {
    expect(
      createApiErrorLogContext({
        endpoint: "/api/desafios",
        error: new Error("offline"),
        message: "A API REST nao respondeu.",
        method: "GET",
        status: 0,
        token: "segredo",
        type: "network",
      })
    ).toEqual({
      endpoint: "/api/desafios",
      error: {
        message: "offline",
        name: "Error",
      },
      message: "A API REST nao respondeu.",
      method: "GET",
      status: 0,
      type: "network",
    });
  });
});
