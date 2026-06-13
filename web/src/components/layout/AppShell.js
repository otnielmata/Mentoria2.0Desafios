"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getNavigationItemsForRole,
  isPublicRoute,
  publicNavigationItems,
  roleLabels,
  roles,
} from "@/config/navigation";
import GlobalFeedback from "@/components/layout/GlobalFeedback";
import ThemeToggle from "@/components/theme/ThemeToggle";
import Button from "@/components/ui/Button";
import { clearSession, getCurrentUser } from "@/services/session.service";

function Brand() {
  return (
    <Link className="brand" href="/">
      <span>DM</span>
      <strong>Desafios Mentoria 2.0</strong>
    </Link>
  );
}

function NavigationLinks({ items, pathname }) {
  return items.map((item) => {
    const isActive = pathname === item.href;

    if (item.disabled) {
      return (
        <span aria-disabled="true" className="nav-item nav-item-disabled" key={item.href}>
          {item.label}
        </span>
      );
    }

    return (
      <Link
        aria-current={isActive ? "page" : undefined}
        className={`nav-item ${isActive ? "active" : ""}`}
        href={item.href}
        key={item.href}
      >
        {item.label}
      </Link>
    );
  });
}

function MobileNavigation({ items, pathname }) {
  return (
    <details className="mobile-nav">
      <summary>Menu</summary>
      <nav aria-label="Navegacao mobile">
        <NavigationLinks items={items} pathname={pathname} />
      </nav>
    </details>
  );
}

function PublicLayout({ children, pathname }) {
  return (
    <div className="app-shell app-shell-public">
      <header className="topbar public-topbar">
        <Brand />
        <nav className="main-nav desktop-nav" aria-label="Navegacao publica">
          <NavigationLinks items={publicNavigationItems} pathname={pathname} />
        </nav>
        <div className="toolbar">
          <ThemeToggle />
          <MobileNavigation items={publicNavigationItems} pathname={pathname} />
        </div>
      </header>
      <GlobalFeedback />
      {children}
    </div>
  );
}

function AuthenticatedLayout({ children, pathname }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const role = user?.role || roles.student;
  const roleLabel = roleLabels[role] || roleLabels[roles.student];
  const navItems = getNavigationItemsForRole(role);

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <div className="app-shell app-shell-authenticated">
      <header className="topbar authenticated-topbar">
        <Brand />
        <nav className="main-nav desktop-nav" aria-label="Navegacao principal">
          <NavigationLinks items={navItems} pathname={pathname} />
        </nav>
        <div className="toolbar">
          <span className="role-badge">{roleLabel}</span>
          <ThemeToggle />
          <MobileNavigation items={navItems} pathname={pathname} />
          <Button onClick={logout} variant="ghost" type="button">
            Sair
          </Button>
        </div>
      </header>
      <GlobalFeedback />
      {children}
    </div>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return <PublicLayout pathname={pathname}>{children}</PublicLayout>;
  }

  return <AuthenticatedLayout pathname={pathname}>{children}</AuthenticatedLayout>;
}
