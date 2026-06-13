"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { listHeuristics } from "@/controllers/heuristic.controller";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { getToken } from "@/services/session.service";

export default function HeuristicsPage() {
  const router = useRouter();
  const [emptyState, setEmptyState] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setLoading] = useState(true);

  async function loadItems() {
    if (!getToken()) {
      setLoading(false);
      setStatus({
        type: "error",
        message: "Entre na sua conta para visualizar heuristicas.",
      });
      router.replace("/login");
      return;
    }

    setLoading(true);
    setStatus({ type: "", message: "" });

    const result = await listHeuristics();
    setLoading(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message });

      if (result.shouldRedirectToLogin || result.status === 401) {
        router.replace("/login");
      }

      return;
    }

    setItems(result.data);
    setEmptyState(result.emptyState);
  }

  useEffect(() => {
    loadItems();
  }, [router]);

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Heuristicas</p>
        <h1>Apresentar heuristicas</h1>
        <p>Consulte rapidamente as diretrizes registradas na plataforma.</p>
      </section>

      <section className="list-panel heuristic-page-panel" aria-live="polite">
        <div className="list-heading">
          <div>
            <h2>Heuristicas cadastradas</h2>
            <p>Ordem preservada conforme retorno da API.</p>
          </div>
          <Button disabled={isLoading} onClick={loadItems} type="button" variant="secondary">
            {isLoading ? "Carregando..." : "Tentar novamente"}
          </Button>
        </div>

        <Alert type={status.type}>{status.message}</Alert>

        {isLoading ? (
          <p className="empty-state">Carregando heuristicas...</p>
        ) : emptyState ? (
          <div className="empty-state-box">
            <h3>{emptyState.title}</h3>
            <p>{emptyState.description}</p>
          </div>
        ) : (
          <div className="heuristic-list">
            {items.map((item) => (
              <article className="heuristic-item" key={item.id}>
                <h3>{item.titulo}</h3>
                <p>{item.descricao}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
