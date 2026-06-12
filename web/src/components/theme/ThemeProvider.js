"use client";

import { useEffect } from "react";

const STORAGE_KEY = "mentoria-theme";

export default function ThemeProvider({ children }) {
  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = storedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  }, []);

  return children;
}
