import { describe, expect, it } from "vitest";
import {
  authenticatedNavigationItems,
  defaultAuthenticatedPath,
  getAuthorizedNavigationItems,
  getLoginRedirectPath,
  getRouteAccessDecision,
  isProtectedRoute,
  isPublicRoute,
  routeRules,
  resolvePostLoginRedirect,
  roles,
} from "@/config/access-control";

const studentSession = {
  token: "token-aluno",
  user: { role: roles.student },
};

const adminSession = {
  token: "token-admin",
  user: { role: roles.admin },
};

const teacherSession = {
  token: "token-professor",
  user: { role: roles.teacher },
};

describe("config/access-control", () => {
  it("permite rotas publicas sem sessao", () => {
    expect(isPublicRoute("/login")).toBe(true);
    expect(isPublicRoute("/registro")).toBe(true);
    expect(getRouteAccessDecision({ pathname: "/login", session: null })).toEqual({
      allowed: true,
      reason: "public-route",
    });
  });

  it("bloqueia rotas protegidas sem sessao e preserva a rota desejada", () => {
    const decision = getRouteAccessDecision({
      pathname: "/registrar-desafio?tab=grupo",
      session: null,
    });

    expect(isProtectedRoute("/registrar-desafio")).toBe(true);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("missing-session");
    expect(decision.redirectTo).toBe(getLoginRedirectPath("/registrar-desafio?tab=grupo"));
  });

  it("permite rota protegida com sessao valida", () => {
    expect(getRouteAccessDecision({ pathname: "/meus-desafios", session: studentSession })).toEqual({
      allowed: true,
      reason: "authorized-route",
      userRole: roles.student,
    });
  });

  it("bloqueia perfil sem permissao para area administrativa", () => {
    const decision = getRouteAccessDecision({ pathname: "/alunos", session: studentSession });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe("forbidden-role");
    expect(decision.userRole).toBe(roles.student);
  });

  it("permite admin em area administrativa", () => {
    expect(getRouteAccessDecision({ pathname: "/alunos", session: adminSession }).allowed).toBe(true);
  });

  it("mantem perfil acessivel para aluno, professor e admin", () => {
    expect(getRouteAccessDecision({ pathname: "/perfil", session: studentSession }).allowed).toBe(true);
    expect(getRouteAccessDecision({ pathname: "/perfil", session: teacherSession }).allowed).toBe(true);
    expect(getRouteAccessDecision({ pathname: "/perfil", session: adminSession }).allowed).toBe(true);
  });

  it("filtra navegacao conforme perfil", () => {
    const studentLabels = getAuthorizedNavigationItems(roles.student).map((item) => item.label);
    const teacherLabels = getAuthorizedNavigationItems(roles.teacher).map((item) => item.label);
    const adminLabels = getAuthorizedNavigationItems(roles.admin).map((item) => item.label);

    expect(studentLabels).toEqual([
      "Inicio",
      "Registrar Desafio",
      "Meus Desafios",
      "Minha Pontuacao",
      "Meus Grupos",
      "Ranking",
      "Meu Perfil",
    ]);
    const adminMenu = [
      "Dashboard",
      "Ranking",
      "Alunos",
      "Turmas",
      "Pilares",
      "Desafios",
      "Aprovacoes",
      "Grupos",
      "Relatorios",
      "Configuracoes",
    ];

    expect(teacherLabels).toEqual(adminMenu);
    expect(adminLabels).toEqual(adminMenu);
  });

  it("evita redirecionamento externo apos login", () => {
    expect(resolvePostLoginRedirect("/registrar-desafio")).toBe("/registrar-desafio");
    expect(resolvePostLoginRedirect("https://example.com")).toBe(defaultAuthenticatedPath);
    expect(resolvePostLoginRedirect("//example.com")).toBe(defaultAuthenticatedPath);
    expect(resolvePostLoginRedirect("/login")).toBe(defaultAuthenticatedPath);
  });

  it("remove navegacao e rotas do escopo antigo de teste", () => {
    const legacyToken = ["he", "ur"].join("");
    const allRouteText = JSON.stringify({ authenticatedNavigationItems, routeRules });

    expect(allRouteText.toLowerCase()).not.toContain(legacyToken);
  });
});
