"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  defaultAuthenticatedPath,
  getRouteAccessDecision,
  isProtectedRoute,
} from "@/config/access-control";
import Button from "@/components/ui/Button";
import { getSession, subscribeSession } from "@/services/session.service";

const initialState = {
  decision: null,
  status: "checking",
};

function getCurrentPathWithSearch(pathname) {
  if (typeof window === "undefined") {
    return pathname || defaultAuthenticatedPath;
  }

  return `${window.location.pathname}${window.location.search}`;
}

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const currentPath = getCurrentPathWithSearch(pathname);

    function updateAccess(session) {
      const decision = getRouteAccessDecision({ pathname: currentPath, session });

      if (decision.reason === "missing-session") {
        router.replace(decision.redirectTo);
        setState({ decision, status: "redirecting" });
        return;
      }

      if (decision.reason === "forbidden-role") {
        setState({ decision, status: "forbidden" });
        return;
      }

      setState({ decision, status: "allowed" });
    }

    updateAccess(getSession());
    return subscribeSession(updateAccess);
  }, [pathname, router]);

  if (state.status === "checking" && isProtectedRoute(pathname)) {
    return (
      <main className="route-guard-screen" aria-busy="true">
        <p>Verificando acesso...</p>
      </main>
    );
  }

  if (state.status === "redirecting") {
    return (
      <main className="route-guard-screen" aria-busy="true">
        <p>Redirecionando para login...</p>
      </main>
    );
  }

  if (state.status === "forbidden") {
    return (
      <main className="route-guard-screen">
        <section className="access-denied-panel">
          <p className="eyebrow">Acesso restrito</p>
          <h1>Esta area nao esta liberada para o seu perfil.</h1>
          <p>
            A navegacao da web oculta areas nao autorizadas, mas a API continua sendo
            responsavel pela autorizacao definitiva.
          </p>
          <Button as={Link} href={defaultAuthenticatedPath}>
            Voltar ao dashboard
          </Button>
        </section>
      </main>
    );
  }

  return children;
}
