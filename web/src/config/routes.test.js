import { describe, expect, it } from "vitest";
import {
  isProtectedRoute,
  navigationItems,
  protectedRoutes,
  publicRoutes,
} from "@/config/routes";

describe("config/routes", () => {
  it("mantem rotas publicas e protegidas separadas", () => {
    expect(publicRoutes.map((route) => route.href)).toEqual(["/", "/login", "/registro"]);
    expect(protectedRoutes.map((route) => route.href)).toEqual(["/dashboard", "/heuristicas"]);
  });

  it("identifica rotas protegidas e subrotas", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/heuristicas/detalhe")).toBe(true);
    expect(isProtectedRoute("/login")).toBe(false);
  });

  it("usa navegacao inicial preparada para areas protegidas", () => {
    expect(navigationItems.map((route) => route.href)).toEqual([
      "/",
      "/dashboard",
      "/heuristicas",
    ]);
  });
});
