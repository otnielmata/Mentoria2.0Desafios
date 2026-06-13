"use client";

import { useEffect } from "react";
import { resolveInitialTheme, THEME_STORAGE_KEY } from "@/config/theme";

export default function ThemeProvider({ children }) {
  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = resolveInitialTheme({ storedTheme, prefersDark });
    document.documentElement.dataset.theme = theme;
  }, []);

  return children;
}
