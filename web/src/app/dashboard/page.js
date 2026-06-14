"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAdminDashboard, getStudentDashboard } from "@/controllers/dashboard.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import { roles } from "@/config/access-control";
import {
  createAsyncStateFromResult,
  createEmptyAsyncState,
  createLoadingAsyncState,
} from "@/models/async-state.model";
import { hasAdminDashboardData } from "@/models/dashboard.model";
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

function isAdminDashboardRole(role) {
  return [roles.teacher, roles.admin].includes(role);
}

function formatRate(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
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

function StudentDashboardContent({ dashboard }) {
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

function AdminHighlights({ emptyMessage, items, metricLabel }) {
  if (!items.length) {
    return <p className="empty-state">{emptyMessage}</p>;
  }

  return (
    <ul className="admin-highlight-list">
      {items.map((item) => (
        <li className="admin-highlight-item" key={item.id || item.name}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.approvedChallenges} desafios aprovados</span>
          </div>
          <strong>
            {metricLabel === "points" ? `${item.points} pts` : `${item.submissions} envios`}
          </strong>
        </li>
      ))}
    </ul>
  );
}

function AdminEngagement({ engagement }) {
  const metrics = [
    { label: "Participacao", value: formatRate(engagement.participationRate) },
    { label: "Taxa de aprovacao", value: formatRate(engagement.approvalRate) },
    { label: "Alunos com envio", value: engagement.studentsWithSubmissions },
    { label: "Media de envios", value: engagement.averageSubmissionsPerStudent.toFixed(1) },
  ];

  return (
    <section className="admin-engagement-grid" aria-label="Resumo de engajamento">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} label={metric.label} value={metric.value} />
      ))}
    </section>
  );
}

function AdminDashboardContent({ dashboard }) {
  const metrics = [
    { label: "Alunos ativos", value: dashboard.activeStudents },
    { label: "Total de envios", value: dashboard.totalSubmissions },
    { label: "Envios pendentes", value: dashboard.pendingApprovals },
  ];

  return (
    <>
      <section className="dashboard-grid admin-dashboard-grid" aria-label="Resumo do dashboard geral">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <AdminEngagement engagement={dashboard.engagement} />

      <section className="dashboard-sections">
        <DataList title="Alunos mais engajados">
          <AdminHighlights
            emptyMessage="Nenhum aluno engajado encontrado."
            items={dashboard.topEngagedStudents}
            metricLabel="points"
          />
        </DataList>

        <DataList title="Baixa participacao">
          <AdminHighlights
            emptyMessage="Nenhum aluno com baixa participacao encontrado."
            items={dashboard.lowParticipationStudents}
            metricLabel="submissions"
          />
        </DataList>
      </section>
    </>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [dashboardStatus, setDashboardStatus] = useState(
    createLoadingAsyncState("Carregando dashboard...")
  );

  const loadDashboard = useCallback(async () => {
    const currentUser = getCurrentUser();
    const isAdminDashboard = isAdminDashboardRole(currentUser?.role);

    setUser(currentUser);
    setDashboardStatus(
      createLoadingAsyncState(
        isAdminDashboard ? "Carregando dashboard geral..." : "Carregando dashboard do aluno..."
      )
    );

    const result = isAdminDashboard ? await getAdminDashboard() : await getStudentDashboard();

    if (result.ok && isAdminDashboard && !hasAdminDashboardData(result.data)) {
      setDashboardStatus(createEmptyAsyncState("Nenhum indicador geral encontrado para a mentoria."));
      return;
    }

    setDashboardStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: isAdminDashboard
          ? "Nenhum indicador geral encontrado para a mentoria."
          : "Nenhum indicador encontrado para este aluno.",
        fallbackMessage: isAdminDashboard
          ? "Nao foi possivel carregar o dashboard geral."
          : "Nao foi possivel carregar o dashboard do aluno.",
      })
    );
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dashboard = dashboardStatus.data;
  const adminDashboard = isAdminDashboardRole(user?.role);

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">{adminDashboard ? "Admin" : "Dashboard"}</p>
        <h1>{adminDashboard ? "Dashboard geral" : `Ola${user?.name ? `, ${user.name}` : ""}.`}</h1>
        <p>
          {adminDashboard
            ? "Acompanhe alunos, envios, aprovacoes pendentes e sinais de engajamento da mentoria."
            : "Esta area concentra os fluxos do Metodo do Alavanque: desafios, pilares, pontuacao, aprovacoes e ranking."}
        </p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage={adminDashboard ? "Carregando dashboard geral..." : "Carregando dashboard do aluno..."}
        onRetry={loadDashboard}
        status={dashboardStatus}
      >
        {dashboard && adminDashboard ? <AdminDashboardContent dashboard={dashboard} /> : null}
        {dashboard && !adminDashboard ? <StudentDashboardContent dashboard={dashboard} /> : null}
      </AsyncStateView>

      <section className="inline-panel">
        <div>
          <h2>{adminDashboard ? "Aprovacoes" : "Desafios"}</h2>
          <p>
            {adminDashboard
              ? "Acesse a fila de envios pendentes para avaliar desafios dos alunos."
              : "Registre atividades realizadas e acompanhe a avaliacao do professor."}
          </p>
        </div>
        <Button as={Link} href={adminDashboard ? "/aprovacoes" : "/registrar-desafio"}>
          {adminDashboard ? "Ver aprovacoes" : "Registrar desafio"}
        </Button>
      </section>
    </main>
  );
}
