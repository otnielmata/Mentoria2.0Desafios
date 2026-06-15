import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const componentPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "AuthGuard.js");

function readComponent() {
  return fs.readFileSync(componentPath, "utf8");
}

describe("components/auth/AuthGuard", () => {
  it("trata sessao sem perfil como invalida e orienta novo login", () => {
    const source = readComponent();

    expect(source).toContain("invalid-session");
    expect(source).toContain("Sessao invalida");
    expect(source).toContain("Faca login novamente");
    expect(source).toContain("clearSession");
  });

  it("mantem bloqueio claro para rota fora do perfil", () => {
    const source = readComponent();

    expect(source).toContain("Acesso restrito");
    expect(source).toContain("Esta area nao esta liberada para o seu perfil.");
  });
});
