import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkFormatting,
  getFormattingIssues,
  normalizeFormatting,
} from "./format-check.mjs";
import { runLint } from "./lint.mjs";
import {
  parseEnvContent,
  validatePublicEnv,
} from "./validate-env.mjs";

let tmpRoot;

function writeFile(relativePath, content) {
  const filePath = path.join(tmpRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe("scripts/quality", () => {
  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "web-quality-"));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { force: true, recursive: true });
  });

  it("detecta e normaliza problemas simples de formatacao", () => {
    const content = "const nome = 'Mentoria';  \r\n";

    expect(getFormattingIssues(content)).toEqual([
      "usa quebra de linha nao padronizada",
      "possui espaco final na linha 1",
    ]);
    expect(normalizeFormatting(content)).toBe("const nome = 'Mentoria';\n");
  });

  it("verifica formatacao de arquivos configurados", () => {
    const filePath = writeFile("src/example.js", "const ok = true;  \n");

    expect(checkFormatting({ files: [filePath], root: tmpRoot })).toEqual([
      {
        file: "src/example.js",
        issues: ["possui espaco final na linha 1"],
      },
    ]);
  });

  it("aponta problemas criticos de lint sem depender da API real", () => {
    const focused = "describe" + ".only('fluxo', () => {});";
    const directFetch = "export async function load() { return " + "fetch('/api'); }";
    const files = [
      writeFile("src/app/page.js", `${focused}\n`),
      writeFile("src/components/example.js", `${directFetch}\n`),
    ];

    const issues = runLint({ files, root: tmpRoot });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: "src/app/page.js", id: "no-focused-tests" }),
        expect.objectContaining({
          file: "src/components/example.js",
          id: "no-direct-fetch-outside-api-client",
        }),
      ])
    );
  });

  it("valida variaveis publicas sem permitir segredo no bundle", () => {
    expect(
      validatePublicEnv(
        parseEnvContent("NEXT_PUBLIC_API_BASE_URL=https://api.example.com\nNEXT_PUBLIC_APP_ENV=production\n"),
        { mode: "production" }
      )
    ).toEqual([]);

    expect(
      validatePublicEnv(
        parseEnvContent("NEXT_PUBLIC_API_BASE_URL=https://api.example.com\nNEXT_PUBLIC_JWT_SECRET=segredo\n"),
        { mode: "production" }
      )
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "NEXT_PUBLIC_JWT_SECRET",
          message: "segredos nao devem usar NEXT_PUBLIC_ nem ir para o bundle do cliente",
        }),
      ])
    );
  });
});
