"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mentoria-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme || "light";
    setTheme(currentTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
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
