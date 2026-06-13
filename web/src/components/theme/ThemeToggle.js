"use client";

import { getThemeButtonLabel } from "@/config/theme";
import { useTheme } from "@/components/theme/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      aria-label="Alternar tema claro ou escuro"
      aria-pressed={theme === "dark"}
      className="theme-toggle"
      onClick={toggleTheme}
      title="Alternar tema"
      type="button"
    >
      {getThemeButtonLabel(theme)}
    </button>
  );
}
