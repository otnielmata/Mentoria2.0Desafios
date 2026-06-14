"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { getCurrentUser } from "@/services/session.service";

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Dashboard</p>
        <h1>Ola{user?.name ? `, ${user.name}` : ""}.</h1>
        <p>
          Esta area concentra os fluxos do Metodo do Alavanque: desafios,
          pilares, pontuacao, aprovacoes e ranking.
        </p>
      </section>

      <section className="dashboard-grid" aria-label="Resumo do painel">
        <article className="metric-card">
          <span>0</span>
          <p>Desafios enviados</p>
        </article>
        <article className="metric-card">
          <span>0</span>
          <p>Pontos acumulados</p>
        </article>
        <article className="metric-card">
          <span>0</span>
          <p>Envios pendentes</p>
        </article>
      </section>

      <section className="inline-panel">
        <div>
          <h2>Desafios</h2>
          <p>Registre atividades realizadas e acompanhe a avaliacao do professor.</p>
        </div>
        <Button as={Link} href="/registrar-desafio">
          Registrar desafio
        </Button>
      </section>
    </main>
  );
}
