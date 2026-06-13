import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  getNextTheme,
  getThemeButtonLabel,
  getThemeTokens,
  isSupportedTheme,
  requiredThemeTokens,
  resolveInitialTheme,
  themeTokens,
  themes,
} from "@/config/theme";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function hexToRgb(hex) {
  return hex
    .replace("#", "")
    .match(/.{2}/g)
    .map((value) => parseInt(value, 16) / 255);
}

function relativeLuminance(hex) {
  const [red, green, blue] = hexToRgb(hex).map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  );

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe("config/theme", () => {
  it("usa tema salvo quando a preferencia manual existe", () => {
    expect(resolveInitialTheme({ storedTheme: themes.dark, prefersDark: false })).toBe(themes.dark);
    expect(resolveInitialTheme({ storedTheme: themes.light, prefersDark: true })).toBe(themes.light);
  });

  it("usa preferencia do sistema quando nao ha escolha salva", () => {
    expect(resolveInitialTheme({ prefersDark: true })).toBe(themes.dark);
    expect(resolveInitialTheme({ prefersDark: false })).toBe(themes.light);
  });

  it("alterna tema e labels do botao", () => {
    expect(getNextTheme(themes.light)).toBe(themes.dark);
    expect(getNextTheme(themes.dark)).toBe(themes.light);
    expect(getThemeButtonLabel(themes.light)).toBe("Escuro");
    expect(getThemeButtonLabel(themes.dark)).toBe("Claro");
  });

  it("mantem todos os tokens obrigatorios nos temas", () => {
    Object.values(themes).forEach((theme) => {
      const tokens = getThemeTokens(theme);

      requiredThemeTokens.forEach((token) => {
        expect(tokens[token], `${theme}.${token}`).toBeTruthy();
      });
    });

    expect(isSupportedTheme("invalido")).toBe(false);
  });

  it("mantem contraste minimo nos pares principais", () => {
    Object.values(themeTokens).forEach((tokens) => {
      expect(contrastRatio(tokens.text, tokens.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens.text, tokens.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens.muted, tokens.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens.onPrimary, tokens.primary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens.danger, tokens.dangerSurface)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens.success, tokens.successSurface)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it("define tokens globais de tema no CSS em vez de espalhar cores em componentes", () => {
    const css = fs.readFileSync(path.join(webRoot, "src/app/globals.css"), "utf8");

    [
      "--background",
      "--surface",
      "--text",
      "--focus-ring",
      "--hover-surface",
      "--disabled-background",
      "--loading-surface",
      "--danger-surface",
      "--success-surface",
    ].forEach((token) => {
      expect(css).toContain(token);
    });

    expect(css).toContain(':root[data-theme="dark"]');
  });
});
