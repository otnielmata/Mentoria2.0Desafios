"use client";

import { useCallback, useEffect, useState } from "react";
import { getGroups } from "@/controllers/groups.controller";
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

function GroupItem({ group }) {
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
          <dt>Lider</dt>
          <dd>{group.leaderName}</dd>
        </div>
        <div>
          <dt>Participantes</dt>
          <dd>{group.participants.length} de 5</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{group.statusLabel}</dd>
        </div>
        <div>
          <dt>Turma</dt>
          <dd>{group.className || "Nao informada"}</dd>
        </div>
        <div>
          <dt>Pontos</dt>
          <dd>{group.points}</dd>
        </div>
        <div>
          <dt>Envio</dt>
          <dd>{group.submissionId || "Nao informado"}</dd>
        </div>
      </dl>

      <details className="group-details">
        <summary>Ver participantes</summary>
        <div className="group-details-content">
          <h4>Participantes vinculados</h4>
          <ParticipantList participants={group.participants} />
          <p>Todos recebem pontos quando o envio for aprovado pela API REST.</p>
        </div>
      </details>
    </article>
  );
}

function GroupsList({ groups }) {
  return (
    <DataList className="group-list-panel" title="Grupos de envios">
      <div className="group-list">
        {groups.map((group) => (
          <GroupItem key={group.id || group.submissionId || group.challengeTitle} group={group} />
        ))}
      </div>
    </DataList>
  );
}

export default function GruposPage() {
  const [groupsStatus, setGroupsStatus] = useState(createLoadingAsyncState("Carregando grupos..."));

  const loadGroups = useCallback(async () => {
    setGroupsStatus(createLoadingAsyncState("Carregando grupos..."));

    const result = await getGroups();

    setGroupsStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Ainda nao existem envios em grupo.",
        fallbackMessage: "Nao foi possivel carregar os grupos.",
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
        <p className="eyebrow">Admin</p>
        <h1>Grupos</h1>
        <p>Acompanhe colaboracao, responsaveis e participantes dos envios coletivos.</p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando grupos..."
        onRetry={loadGroups}
        status={groupsStatus}
      >
        <GroupsList groups={groups} />
      </AsyncStateView>
    </main>
  );
}
