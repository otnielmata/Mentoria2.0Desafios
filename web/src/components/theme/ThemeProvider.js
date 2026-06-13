"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getNextTheme, resolveInitialTheme, THEME_STORAGE_KEY, themes } from "@/config/theme";

const ThemeContext = createContext({
  setTheme: () => {},
  theme: themes.light,
  toggleTheme: () => {},
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}

export default function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(themes.light);

  const setTheme = useCallback((nextTheme) => {
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getNextTheme(theme));
  }, [setTheme, theme]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = resolveInitialTheme({ storedTheme, prefersDark });
    applyTheme(initialTheme);
    setThemeState(initialTheme);
  }, []);

  const value = useMemo(() => ({ setTheme, theme, toggleTheme }), [setTheme, theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
