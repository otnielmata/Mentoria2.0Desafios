"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getMyScore } from "@/controllers/my-score.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import {
  createAsyncStateFromResult,
  createEmptyAsyncState,
  createLoadingAsyncState,
} from "@/models/async-state.model";
import { hasApprovedScore } from "@/models/my-score.model";
import { getCurrentUser } from "@/services/session.service";

function formatDate(value) {
  if (!value) {
    return "Data nao informada";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function MetricCard({ label, value }) {
  return (
    <article className="metric-card">
      <span>{value}</span>
      <p>{label}</p>
    </article>
  );
}

function ScoreOverview({ score }) {
  const metrics = [
    { label: "Pontos totais", value: `${score.totalPoints} pts` },
    { label: "Desafios aprovados", value: score.approvedChallenges },
    { label: "Registros no historico", value: score.history.length },
  ];

  return (
    <section className="score-summary-grid" aria-label="Resumo da minha pontuacao">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} label={metric.label} value={metric.value} />
      ))}
    </section>
  );
}

function PillarScores({ scores }) {
  if (!scores.length) {
    return <p className="empty-state">Nenhuma pontuacao por pilar encontrada.</p>;
  }

  return (
    <ul className="my-score-pillar-list">
      {scores.map((item) => (
        <li className="my-score-pillar-item" key={item.id || item.name}>
          <div>
            <strong>{item.name}</strong>
            <span>{item.approvedChallenges} desafios aprovados</span>
          </div>
          <strong>{item.points} pts</strong>
        </li>
      ))}
    </ul>
  );
}

function ScoreHistory({ history }) {
  if (!history.length) {
    return <p className="empty-state">Nenhum ponto concedido encontrado no historico.</p>;
  }

  return (
    <ul className="my-score-history-list">
      {history.map((item) => (
        <li className="my-score-history-item" key={item.id || `${item.submissionId}-${item.createdAt}`}>
          <div>
            <strong>{item.reason}</strong>
            <span>{item.challengeTitle}</span>
            <span>{item.pillarName}</span>
          </div>
          <dl>
            <div>
              <dt>Pontos</dt>
              <dd>{item.points} pts</dd>
            </div>
            <div>
              <dt>Data</dt>
              <dd>{formatDate(item.approvedAt || item.createdAt)}</dd>
            </div>
            <div>
              <dt>Envio</dt>
              <dd>{item.submissionId || "Nao informado"}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

function ScoreContent({ score }) {
  return (
    <>
      <ScoreOverview score={score} />

      <section className="dashboard-sections">
        <DataList title="Pontuacao por pilar">
          <PillarScores scores={score.pointsByPillar} />
        </DataList>

        <DataList title="Historico de pontos">
          <ScoreHistory history={score.history} />
        </DataList>
      </section>
    </>
  );
}

export default function MinhaPontuacaoPage() {
  const [scoreStatus, setScoreStatus] = useState(
    createLoadingAsyncState("Carregando minha pontuacao...")
  );

  const loadScore = useCallback(async () => {
    setScoreStatus(createLoadingAsyncState("Carregando minha pontuacao..."));

    const result = await getMyScore();

    if (result.ok && !hasApprovedScore(result.data)) {
      setScoreStatus(
        createEmptyAsyncState(
          "Voce ainda nao tem pontos aprovados. Registre desafios para acompanhar sua evolucao."
        )
      );
      return;
    }

    setScoreStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Voce ainda nao tem pontos aprovados. Registre desafios para acompanhar sua evolucao.",
        fallbackMessage: "Nao foi possivel carregar sua pontuacao.",
      })
    );
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (currentUser?.role && currentUser.role !== "aluno") {
      setScoreStatus(createEmptyAsyncState("Minha pontuacao esta disponivel apenas para alunos."));
      return;
    }

    loadScore();
  }, [loadScore]);

  const score = scoreStatus.data;

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Aluno</p>
        <h1>Minha pontuacao</h1>
        <p>Veja pontos aprovados, distribuicao por pilar e historico de pontos concedidos.</p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando minha pontuacao..."
        onRetry={loadScore}
        status={scoreStatus}
      >
        {score ? <ScoreContent score={score} /> : null}
      </AsyncStateView>

      <section className="inline-panel">
        <div>
          <h2>Registrar desafios</h2>
          <p>Envie atividades realizadas para que o professor avalie e aprove seus pontos.</p>
        </div>
        <Button as={Link} href="/registrar-desafio">
          Registrar desafio
        </Button>
      </section>
    </main>
  );
}
