export const THEME_STORAGE_KEY = "mentoria-theme";

export const themes = {
  light: "light",
  dark: "dark",
};

export function resolveInitialTheme({ storedTheme, prefersDark } = {}) {
  if (storedTheme === themes.light || storedTheme === themes.dark) {
    return storedTheme;
  }

  return prefersDark ? themes.dark : themes.light;
}

export function getNextTheme(currentTheme) {
  return currentTheme === themes.dark ? themes.light : themes.dark;
}
