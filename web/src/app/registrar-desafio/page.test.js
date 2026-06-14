import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "page.js");

function readPage() {
  return fs.readFileSync(pagePath, "utf8");
}

describe("app/registrar-desafio/page", () => {
  it("usa controller de envio e formulario padronizado sem fetch direto", () => {
    const source = readPage();

    expect(source).toContain("submitChallengeSubmission");
    expect(source).toContain("getPillars");
    expect(source).toContain("useFormController");
    expect(source).toContain("Alert");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("apiEndpoints");
  });

  it("renderiza campos exigidos pela MR-72", () => {
    const source = readPage();

    expect(source).toContain("Pilar");
    expect(source).toContain("Desafio realizado");
    expect(source).toContain("Tipo de envio");
    expect(source).toContain("Participantes do grupo");
    expect(source).toContain("Descricao do que foi feito");
    expect(source).toContain("Evidencia, link ou comprovante");
    expect(source).toContain("Enviar para aprovacao");
  });

  it("carrega a lista de pilares a partir da API", () => {
    const source = readPage();

    expect(source).toContain("toPillarSelectOptions");
    expect(source).toContain("Lista carregada dos pilares cadastrados na API.");
    expect(source).not.toContain("methodPillars");
  });

  it("exibe responsavel e status pendente sem pontuacao concedida", () => {
    const source = readPage();

    expect(source).toContain("Responsavel pelo envio");
    expect(source).toContain("Pendente");
    expect(source).toContain("Apenas apos aprovacao");
  });
});
