export const THEME_STORAGE_KEY = "mentoria-theme";

export const themes = {
  light: "light",
  dark: "dark",
};

export const requiredThemeTokens = [
  "background",
  "surface",
  "surfaceStrong",
  "text",
  "muted",
  "line",
  "primary",
  "primaryStrong",
  "onPrimary",
  "danger",
  "dangerSurface",
  "success",
  "successSurface",
  "focusRing",
  "hoverSurface",
  "disabledBackground",
  "disabledText",
  "loadingSurface",
];

export const themeTokens = {
  [themes.light]: {
    background: "#f7f7f2",
    surface: "#ffffff",
    surfaceStrong: "#f0efe7",
    text: "#20211d",
    muted: "#62645a",
    line: "#deddd1",
    primary: "#0f766e",
    primaryStrong: "#115e59",
    onPrimary: "#ffffff",
    danger: "#b42318",
    dangerSurface: "#f9e6e3",
    success: "#157347",
    successSurface: "#e4f5ec",
    focusRing: "#9ee7db",
    hoverSurface: "#e7e5d8",
    disabledBackground: "#e6e4d8",
    disabledText: "#737568",
    loadingSurface: "#eceadd",
  },
  [themes.dark]: {
    background: "#171812",
    surface: "#24251d",
    surfaceStrong: "#303127",
    text: "#f5f3e9",
    muted: "#c2bdac",
    line: "#434437",
    primary: "#2dd4bf",
    primaryStrong: "#5eead4",
    onPrimary: "#062f2b",
    danger: "#f87171",
    dangerSurface: "#3f1f1f",
    success: "#6ee7b7",
    successSurface: "#17392d",
    focusRing: "#134e4a",
    hoverSurface: "#37382e",
    disabledBackground: "#33342a",
    disabledText: "#9b9688",
    loadingSurface: "#2d2e24",
  },
};

export function isSupportedTheme(theme) {
  return theme === themes.light || theme === themes.dark;
}

export function resolveInitialTheme({ storedTheme, prefersDark } = {}) {
  if (isSupportedTheme(storedTheme)) {
    return storedTheme;
  }

  return prefersDark ? themes.dark : themes.light;
}

export function getNextTheme(currentTheme) {
  return currentTheme === themes.dark ? themes.light : themes.dark;
}

export function getThemeButtonLabel(theme) {
  return theme === themes.dark ? "Claro" : "Escuro";
}

export function getThemeTokens(theme) {
  return themeTokens[isSupportedTheme(theme) ? theme : themes.light];
}
