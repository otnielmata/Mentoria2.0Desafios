"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getAuthorizedNavigationItems,
  getUserRole,
  isPublicRoute,
  publicNavigationItems,
  roleLabels,
} from "@/config/access-control";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Button from "@/components/ui/Button";
import { clearSession, getSession, subscribeSession } from "@/services/session.service";

function Brand() {
  return (
    <Link className="brand" href="/">
      <span>DM</span>
      <strong>Desafios Mentoria 2.0</strong>
    </Link>
  );
}

function NavigationLinks({ items, pathname }) {
  return items.map((item) => (
    <Link
      aria-current={pathname === item.href ? "page" : undefined}
      className={pathname === item.href ? "active" : ""}
      href={item.href}
      key={item.href}
    >
      {item.label}
    </Link>
  ));
}

function PublicHeader({ pathname }) {
  return (
    <header className="topbar">
      <Brand />
      <nav className="main-nav" aria-label="Navegacao publica">
        <NavigationLinks items={publicNavigationItems} pathname={pathname} />
      </nav>
      <div className="toolbar">
        <ThemeToggle />
      </div>
    </header>
  );
}

function AuthenticatedHeader({ pathname }) {
  const router = useRouter();
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(getSession());
    return subscribeSession(setSession);
  }, []);

  const role = getUserRole(session);
  const navItems = getAuthorizedNavigationItems(role);
  const roleLabel = role ? roleLabels[role] : "Sessao invalida";

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <header className="topbar">
      <Brand />
      <nav className="main-nav" aria-label="Navegacao principal">
        <NavigationLinks items={navItems} pathname={pathname} />
      </nav>
      <div className="toolbar">
        <span className="role-badge">{roleLabel}</span>
        <ThemeToggle />
        <Button onClick={logout} variant="ghost" type="button">
          Sair
        </Button>
      </div>
    </header>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const publicRoute = isPublicRoute(pathname);

  return (
    <div className={publicRoute ? "app-shell app-shell-public" : "app-shell app-shell-authenticated"}>
      <a className="skip-link" href="#conteudo-principal">
        Pular para conteudo principal
      </a>
      {publicRoute ? <PublicHeader pathname={pathname} /> : <AuthenticatedHeader pathname={pathname} />}
      <div className="main-focus-anchor" id="conteudo-principal" tabIndex="-1" />
      {children}
    </div>
  );
}
