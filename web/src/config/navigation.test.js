import { describe, expect, it } from "vitest";
import {
  getNavigationItemsForRole,
  globalFeedbackDefaults,
  isProtectedRoute,
  isPublicRoute,
  normalizeRole,
  publicNavigationItems,
  roles,
} from "@/config/navigation";

describe("config/navigation", () => {
  it("separa rotas publicas de rotas autenticadas", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/registro")).toBe(true);
    expect(isPublicRoute("/dashboard")).toBe(false);

    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/heuristicas")).toBe(true);
    expect(isProtectedRoute("/login")).toBe(false);
  });

  it("remove query string e hash antes de classificar rotas", () => {
    expect(isPublicRoute("/login?redirect=/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard#inicio")).toBe(true);
  });

  it("mantem navegacao publica sem itens da area autenticada", () => {
    const publicLabels = publicNavigationItems.map((item) => item.label);

    expect(publicLabels).toEqual(["Inicio", "Entrar", "Registrar"]);
    expect(publicLabels).not.toContain("Dashboard");
    expect(publicLabels).not.toContain("Heuristicas");
  });

  it("filtra menus autenticados conforme perfil do usuario", () => {
    const studentLabels = getNavigationItemsForRole(roles.student).map((item) => item.label);
    const teacherLabels = getNavigationItemsForRole(roles.teacher).map((item) => item.label);
    const adminLabels = getNavigationItemsForRole(roles.admin).map((item) => item.label);

    expect(studentLabels).toEqual(["Dashboard", "Heuristicas", "Ranking"]);
    expect(teacherLabels).toEqual(["Dashboard", "Heuristicas", "Alunos", "Desafios", "Ranking"]);
    expect(adminLabels).toEqual(["Dashboard", "Heuristicas", "Alunos", "Desafios", "Ranking"]);
  });

  it("normaliza perfis desconhecidos para aluno", () => {
    expect(normalizeRole("perfil-invalido")).toBe(roles.student);
    expect(normalizeRole(roles.admin)).toBe(roles.admin);
  });

  it("mantem contrato para area global de feedback", () => {
    expect(globalFeedbackDefaults.loadingLabel).toBeTruthy();
    expect(globalFeedbackDefaults.messageRegionLabel).toBeTruthy();
  });
});
