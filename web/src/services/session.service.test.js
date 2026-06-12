import { afterEach, describe, expect, it } from "vitest";
import { getSession, saveSession } from "@/services/session.service";

function createLocalStorageMock() {
  const store = new Map();

  return {
    getItem(key) {
      return store.get(key) || null;
    },
    removeItem(key) {
      store.delete(key);
    },
    setItem(key, value) {
      store.set(key, value);
    },
  };
}

describe("session.service", () => {
  afterEach(() => {
    delete global.window;
  });

  it("persiste somente token e dados basicos do usuario", () => {
    global.window = {
      localStorage: createLocalStorageMock(),
    };

    saveSession({
      token: "jwt-token",
      user: {
        id: "1",
        name: "Maria Silva",
        email: "maria@example.com",
        password: "senha123",
        passwordHash: "hash",
      },
    });

    expect(getSession()).toEqual({
      token: "jwt-token",
      user: {
        id: "1",
        name: "Maria Silva",
        email: "maria@example.com",
        role: "",
      },
    });
  });
});
