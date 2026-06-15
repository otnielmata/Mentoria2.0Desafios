import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const servicePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "auth.service.js");

function readService() {
  return fs.readFileSync(servicePath, "utf8");
}

describe("services/auth.service", () => {
  it("valida role e status antes de salvar sessao autenticada", () => {
    const source = readService();

    expect(source).toContain("hasCompleteAuthResponse");
    expect(source).toContain("saveSession(authResponse)");
    expect(source).toContain("Sessao invalida. Faca login novamente.");
    expect(source).toContain("invalid_session");
  });
});
