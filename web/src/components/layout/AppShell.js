"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Button from "@/components/ui/Button";
import { clearSession } from "@/services/session.service";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/heuristicas", label: "Heuristicas" },
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span>DM</span>
          <strong>Desafios Mentoria 2.0</strong>
        </Link>
        <nav className="main-nav" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <Link
              aria-current={pathname === item.href ? "page" : undefined}
              className={pathname === item.href ? "active" : ""}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="toolbar">
          <ThemeToggle />
          <Button onClick={logout} variant="ghost" type="button">
            Sair
          </Button>
        </div>
      </header>
      {children}
    </div>
  );
}
