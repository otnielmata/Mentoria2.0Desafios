"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getStudentDashboard } from "@/controllers/dashboard.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import {
  createAsyncStateFromResult,
  createEmptyAsyncState,
  createLoadingAsyncState,
} from "@/models/async-state.model";
import { getCurrentUser } from "@/services/session.service";

function formatRankingPosition(position) {
  return position ? `${position}o lugar` : "Sem posicao";
}

function MetricCard({ label, value }) {
  return (
    <article className="metric-card">
      <span>{value}</span>
      <p>{label}</p>
    </article>
  );
}

function PillarScores({ scores }) {
  if (!scores.length) {
    return <p className="empty-state">Nenhuma pontuacao por pilar encontrada.</p>;
  }

  return (
    <ul className="pillar-score-list">
      {scores.map((item) => (
        <li className="pillar-score-item" key={item.id || item.name}>
          <span>{item.name}</span>
          <strong>{item.points} pts</strong>
        </li>
      ))}
    </ul>
  );
}

function RecentSubmissions({ submissions }) {
  if (!submissions.length) {
    return <p className="empty-state">Nenhum desafio enviado recentemente.</p>;
  }

  return (
    <ul className="challenge-summary-list">
      {submissions.map((item) => (
        <li className="challenge-summary-item" key={item.id || `${item.challengeTitle}-${item.status}`}>
          <div>
            <strong>{item.challengeTitle}</strong>
            <span>{item.pillarName}</span>
          </div>
          <span className="challenge-status">{item.status}</span>
        </li>
      ))}
    </ul>
  );
}

function DashboardContent({ dashboard }) {
  const metrics = [
    { label: "Pontos totais", value: dashboard.totalPoints },
    { label: "Ranking geral", value: formatRankingPosition(dashboard.rankingPosition) },
    { label: "Desafios aprovados", value: dashboard.approvedChallenges },
    { label: "Desafios pendentes", value: dashboard.pendingChallenges },
  ];

  return (
    <>
      <section className="dashboard-grid" aria-label="Resumo do painel">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <section className="dashboard-sections">
        <DataList title="Pontuacao por pilar">
          <PillarScores scores={dashboard.pointsByPillar} />
        </DataList>

        <DataList title="Ultimos desafios enviados">
          <RecentSubmissions submissions={dashboard.recentSubmissions} />
        </DataList>
      </section>
    </>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [dashboardStatus, setDashboardStatus] = useState(
    createLoadingAsyncState("Carregando dashboard do aluno...")
  );

  const loadDashboard = useCallback(async () => {
    setDashboardStatus(createLoadingAsyncState("Carregando dashboard do aluno..."));

    const result = await getStudentDashboard();

    setDashboardStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhum indicador encontrado para este aluno.",
        fallbackMessage: "Nao foi possivel carregar o dashboard do aluno.",
      })
    );
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();

    setUser(currentUser);

    if (currentUser?.role && currentUser.role !== "aluno") {
      setDashboardStatus(createEmptyAsyncState("Dashboard do aluno disponivel apenas para alunos."));
      return;
    }

    loadDashboard();
  }, [loadDashboard]);

  const dashboard = dashboardStatus.data;

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

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando dashboard do aluno..."
        onRetry={loadDashboard}
        status={dashboardStatus}
      >
        {dashboard ? <DashboardContent dashboard={dashboard} /> : null}
      </AsyncStateView>

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
