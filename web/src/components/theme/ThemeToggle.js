"use client";

import { useEffect, useState } from "react";
import { getNextTheme, THEME_STORAGE_KEY } from "@/config/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme || "light";
    setTheme(currentTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = getNextTheme(theme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      aria-label="Alternar tema claro ou escuro"
      className="theme-toggle"
      onClick={toggleTheme}
      title="Alternar tema"
      type="button"
    >
      {theme === "dark" ? "Claro" : "Escuro"}
    </button>
  );
}
