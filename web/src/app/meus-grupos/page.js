"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyGroups } from "@/controllers/groups.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import DataList from "@/components/ui/DataList";
import {
  createAsyncStateFromResult,
  createLoadingAsyncState,
} from "@/models/async-state.model";

function ParticipantList({ participants }) {
  if (!participants.length) {
    return <p className="empty-state">Nenhum participante vinculado.</p>;
  }

  return (
    <ol className="group-participant-list">
      {participants.map((participant, index) => (
        <li key={participant.id || `${participant.name}-${index}`}>{participant.name}</li>
      ))}
    </ol>
  );
}

function MyGroupItem({ group }) {
  return (
    <article className="group-item">
      <header className="group-item-header">
        <div>
          <h3>{group.challengeTitle}</h3>
          <p>{group.submissionLabel}</p>
        </div>
        <span className={`submission-status submission-status-${group.status}`}>
          {group.statusLabel}
        </span>
      </header>

      <dl className="group-meta">
        <div>
          <dt>Desafio</dt>
          <dd>{group.challengeTitle}</dd>
        </div>
        <div>
          <dt>Pilar</dt>
          <dd>{group.pillarName}</dd>
        </div>
        <div>
          <dt>Responsavel</dt>
          <dd>{group.leaderName}</dd>
        </div>
        <div>
          <dt>Participantes</dt>
          <dd>{group.participantsCount} de 5</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{group.statusLabel}</dd>
        </div>
        <div>
          <dt>Pontos</dt>
          <dd>{group.pointsLabel}</dd>
        </div>
        <div>
          <dt>Ranking</dt>
          <dd>{group.rankingLabel}</dd>
        </div>
        <div>
          <dt>Turma</dt>
          <dd>{group.className || "Nao informada"}</dd>
        </div>
      </dl>

      <details className="group-details">
        <summary>Ver participantes</summary>
        <div className="group-details-content">
          <h4>Participantes vinculados</h4>
          <ParticipantList participants={group.participants} />
          <p>
            {group.isApproved
              ? "Os pontos deste grupo foram considerados no ranking."
              : "Os pontos entram no ranking somente apos aprovacao do professor."}
          </p>
        </div>
      </details>
    </article>
  );
}

function MyGroupsList({ groups }) {
  return (
    <DataList className="group-list-panel" title="Meus grupos de desafios">
      <div className="group-list">
        {groups.map((group) => (
          <MyGroupItem key={group.id || group.submissionId || group.challengeTitle} group={group} />
        ))}
      </div>
    </DataList>
  );
}

export default function MeusGruposPage() {
  const [groupsStatus, setGroupsStatus] = useState(
    createLoadingAsyncState("Carregando meus grupos...")
  );

  const loadGroups = useCallback(async () => {
    setGroupsStatus(createLoadingAsyncState("Carregando meus grupos..."));

    const result = await getMyGroups();

    setGroupsStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Voce ainda nao participou de desafios em grupo.",
        fallbackMessage: "Nao foi possivel carregar seus grupos.",
      })
    );
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const groups = groupsStatus.data || [];

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Aluno</p>
        <h1>Meus grupos</h1>
        <p>Acompanhe desafios enviados em grupo, participantes, status e pontos aprovados.</p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando meus grupos..."
        onRetry={loadGroups}
        status={groupsStatus}
      >
        <MyGroupsList groups={groups} />
      </AsyncStateView>
    </main>
  );
}
