import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const layoutRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function readLayout(name) {
  return fs.readFileSync(path.join(layoutRoot, name), "utf8");
}

describe("components/layout/AppShell accessibility", () => {
  it("mantem link de pular para conteudo e navegacoes nomeadas", () => {
    const source = readLayout("AppShell.js");

    expect(source).toContain("skip-link");
    expect(source).toContain("conteudo-principal");
    expect(source).toContain("aria-label=\"Navegacao publica\"");
    expect(source).toContain("aria-label=\"Navegacao principal\"");
    expect(source).toContain("aria-current");
  });

  it("exibe estado de sessao invalida quando nao houver role real", () => {
    const source = readLayout("AppShell.js");

    expect(source).toContain("Sessao invalida");
    expect(source).toContain("getAuthorizedNavigationItems(role)");
  });
});
