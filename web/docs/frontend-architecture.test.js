import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const docsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

function readArchitectureDoc() {
  return fs.readFileSync(path.join(docsRoot, "frontend-architecture.md"), "utf8");
}

describe("docs/frontend-architecture", () => {
  it("documenta estrutura de pastas e responsabilidades MVC", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app");
    expect(source).toContain("src/components");
    expect(source).toContain("src/controllers");
    expect(source).toContain("src/models");
    expect(source).toContain("src/services");
  });

  it("documenta fluxo de dados da view ate a API REST", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("View em src/app");
    expect(source).toContain("Controller em src/controllers");
    expect(source).toContain("Service em src/services");
    expect(source).toContain("NEXT_PUBLIC_API_BASE_URL");
  });

  it("documenta comandos, ambiente, endpoints e padroes de UI", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("npm run quality");
    expect(source).toContain("npm run deploy:check");
    expect(source).toContain("POST /api/auth/login");
    expect(source).toContain("POST /api/auth/register");
    expect(source).toContain("GET  /api/dashboard/aluno");
    expect(source).toContain("Tema e UI");
    expect(source).toContain("Componentes base atuais");
  });

  it("documenta o fluxo do dashboard do aluno", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("src/app/dashboard/page.js");
    expect(source).toContain("getStudentDashboard");
    expect(source).toContain("toStudentDashboardDto");
    expect(source).toContain("getStudentDashboardRequest");
  });

  it("documenta observabilidade sem expor dados sensiveis", () => {
    const source = readArchitectureDoc();

    expect(source).toContain("Observabilidade mínima");
    expect(source).toContain("src/services/logger.service.js");
    expect(source).toContain("endpoint, metodo, status, tipo e mensagem sanitizada");
    expect(source).toContain("sem stack trace");
  });
});
