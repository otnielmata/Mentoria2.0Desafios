"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getGeneralRanking } from "@/controllers/ranking.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import {
  createAsyncStateFromResult,
  createEmptyAsyncState,
  createLoadingAsyncState,
} from "@/models/async-state.model";
import { isCurrentRankingEntry } from "@/models/ranking.model";
import { getCurrentUser } from "@/services/session.service";

function formatPosition(position) {
  return position ? `${position}o` : "Sem posicao";
}

function RankingItem({ currentUser, entry }) {
  const isCurrentUser = isCurrentRankingEntry(entry, currentUser);

  return (
    <li
      aria-current={isCurrentUser ? "true" : undefined}
      className={`ranking-item${isCurrentUser ? " ranking-item-current" : ""}`}
    >
      <span className="ranking-position">{formatPosition(entry.position)}</span>
      <div className="ranking-student">
        <strong>{entry.studentName}</strong>
        {isCurrentUser ? (
          <>
            <span className="ranking-current-label">Sua posicao</span>
            <span className="visually-hidden">Esta e a sua posicao no ranking.</span>
          </>
        ) : null}
      </div>
      <strong className="ranking-points">{entry.points} pts</strong>
    </li>
  );
}

function RankingList({ currentUser, ranking }) {
  return (
    <DataList title="Ranking geral">
      <ol className="ranking-list">
        {ranking.entries.map((entry) => (
          <RankingItem
            currentUser={currentUser}
            entry={entry}
            key={entry.id || `${entry.position}-${entry.studentName}`}
          />
        ))}
      </ol>
    </DataList>
  );
}

export default function RankingPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [rankingStatus, setRankingStatus] = useState(
    createLoadingAsyncState("Carregando ranking geral...")
  );

  const loadRanking = useCallback(async () => {
    setRankingStatus(createLoadingAsyncState("Carregando ranking geral..."));

    const result = await getGeneralRanking();

    if (result.ok && !result.data.isAllowed) {
      setRankingStatus(createEmptyAsyncState(result.data.unavailableMessage));
      return;
    }

    if (result.ok && result.data.entries.length === 0) {
      setRankingStatus(createEmptyAsyncState("Ranking ainda nao possui participantes com pontos aprovados."));
      return;
    }

    setRankingStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Ranking ainda nao possui participantes com pontos aprovados.",
        fallbackMessage: "Nao foi possivel carregar o ranking geral.",
      })
    );
  }, []);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    loadRanking();
  }, [loadRanking]);

  const ranking = rankingStatus.data;

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Mentoria</p>
        <h1>Ranking geral</h1>
        <p>Acompanhe a classificacao por pontos aprovados e veja sua posicao na mentoria.</p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando ranking geral..."
        onRetry={loadRanking}
        status={rankingStatus}
      >
        {ranking ? <RankingList currentUser={currentUser} ranking={ranking} /> : null}
      </AsyncStateView>

      <section className="inline-panel">
        <div>
          <h2>Ganhar pontos</h2>
          <p>Registre desafios realizados para entrar na proxima atualizacao do ranking.</p>
        </div>
        <Button as={Link} href="/registrar-desafio">
          Registrar desafio
        </Button>
      </section>
    </main>
  );
}
