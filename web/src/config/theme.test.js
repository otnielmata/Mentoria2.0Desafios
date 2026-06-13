import { describe, expect, it } from "vitest";
import { getNextTheme, resolveInitialTheme, themes } from "@/config/theme";

describe("config/theme", () => {
  it("prioriza tema salvo pelo usuario", () => {
    expect(resolveInitialTheme({ storedTheme: themes.dark, prefersDark: false })).toBe(themes.dark);
  });

  it("usa preferencia do sistema quando nao ha tema salvo", () => {
    expect(resolveInitialTheme({ prefersDark: true })).toBe(themes.dark);
    expect(resolveInitialTheme({ prefersDark: false })).toBe(themes.light);
  });

  it("alterna entre tema claro e escuro", () => {
    expect(getNextTheme(themes.light)).toBe(themes.dark);
    expect(getNextTheme(themes.dark)).toBe(themes.light);
  });
});
