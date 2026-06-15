import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSession,
  getCurrentUser,
  getSession,
  getToken,
  isTokenExpired,
  normalizeSession,
  saveSession,
  subscribeSession,
  SESSION_STORAGE_KEY,
} from "@/services/session.service";

function createStorage() {
  const values = new Map();

  return {
    getItem: vi.fn((key) => values.get(key) || null),
    removeItem: vi.fn((key) => values.delete(key)),
    setItem: vi.fn((key, value) => values.set(key, value)),
  };
}

function createJwt(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");

  return `header.${encodedPayload}.signature`;
}

describe("services/session.service", () => {
  let localStorage;

  beforeEach(() => {
    localStorage = createStorage();
    vi.stubGlobal("window", {
      dispatchEvent: vi.fn(),
      localStorage,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("cria sessao removendo dados sensiveis do usuario", () => {
    const session = saveSession({
      token: "token-valido",
      user: {
        email: "aluno@example.com",
        name: "Aluno",
        password: "nao-pode-salvar",
        role: "aluno",
        status: "ativo",
      },
    });

    expect(session).toEqual({
      token: "token-valido",
      user: {
        email: "aluno@example.com",
        name: "Aluno",
        role: "aluno",
        status: "ativo",
      },
    });
    expect(JSON.parse(localStorage.setItem.mock.calls[0][1]).user.password).toBeUndefined();
  });

  it("restaura sessao persistida e expõe usuario e token", () => {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "token-salvo",
        user: { email: "aluno@example.com", name: "Aluno", role: "aluno", status: "ativo" },
      })
    );

    expect(getSession()).toEqual({
      token: "token-salvo",
      user: { email: "aluno@example.com", name: "Aluno", role: "aluno", status: "ativo" },
    });
    expect(getToken()).toBe("token-salvo");
    expect(getCurrentUser()).toEqual({
      email: "aluno@example.com",
      name: "Aluno",
      role: "aluno",
      status: "ativo",
    });
  });

  it("limpa sessao local ao encerrar acesso", () => {
    saveSession({ token: "token-valido", user: { name: "Aluno" } });

    clearSession();

    expect(localStorage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
  });

  it("descarta token expirado ao restaurar sessao", () => {
    const expiredToken = createJwt({ exp: 1 });
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: expiredToken, user: { name: "Aluno" } }));

    expect(isTokenExpired(expiredToken, 2000)).toBe(true);
    expect(getSession()).toBeNull();
    expect(localStorage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
  });

  it("notifica assinantes quando sessao muda", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSession(listener);

    const session = saveSession({ token: "token-valido", user: { name: "Aluno" } });
    clearSession();
    unsubscribe();
    saveSession({ token: "outro-token", user: { name: "Aluno" } });

    expect(listener).toHaveBeenNthCalledWith(1, session);
    expect(listener).toHaveBeenNthCalledWith(2, null);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("normaliza sessao invalida como nula", () => {
    expect(normalizeSession({ user: { name: "Sem token" } })).toBeNull();
    expect(normalizeSession(null)).toBeNull();
  });
});
