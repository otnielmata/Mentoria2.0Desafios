import { describe, expect, it } from "vitest";
import {
  asyncStates,
  createAsyncStateFromResult,
  createErrorAsyncState,
  createLoadingAsyncState,
  getSafeAsyncErrorMessage,
} from "@/models/async-state.model";

describe("models/async-state", () => {
  it("cria estado de carregamento padronizado", () => {
    expect(createLoadingAsyncState("Carregando desafios...")).toMatchObject({
      isLoading: true,
      message: "Carregando desafios...",
      state: asyncStates.loading,
    });
  });

  it("transforma lista vazia em estado vazio claro", () => {
    expect(
      createAsyncStateFromResult(
        { ok: true, data: [] },
        { emptyMessage: "Nenhum desafio encontrado." }
      )
    ).toMatchObject({
      isEmpty: true,
      message: "Nenhum desafio encontrado.",
      state: asyncStates.empty,
    });
  });

  it("transforma dados retornados em sucesso", () => {
    expect(createAsyncStateFromResult({ ok: true, data: [{ id: "1" }] })).toMatchObject({
      data: [{ id: "1" }],
      isSuccess: true,
      state: asyncStates.success,
    });
  });

  it("gera mensagens seguras para falhas conhecidas", () => {
    expect(getSafeAsyncErrorMessage({ type: "network" })).toBe(
      "A API REST nao respondeu. Verifique a conexao e tente novamente."
    );
    expect(getSafeAsyncErrorMessage({ type: "unauthorized" })).toBe(
      "Sua sessao expirou. Faca login novamente."
    );
  });

  it("cria erro com acao de retry quando fizer sentido", () => {
    expect(createErrorAsyncState({ message: "Falha controlada.", type: "api" })).toMatchObject({
      canRetry: true,
      isError: true,
      message: "Falha controlada.",
      state: asyncStates.error,
      type: "api",
    });
    expect(createErrorAsyncState({ type: "unauthorized" })).toMatchObject({
      canRetry: false,
      message: "Sua sessao expirou. Faca login novamente.",
      state: asyncStates.error,
    });
  });
});
