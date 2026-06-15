"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getMyChallengeSubmissions } from "@/controllers/my-challenge-submissions.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import {
  createAsyncStateFromResult,
  createEmptyAsyncState,
  createLoadingAsyncState,
} from "@/models/async-state.model";
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

function statusClassName(status) {
  return `submission-status submission-status-${status}`;
}

function EvidenceList({ evidences }) {
  if (!evidences.length) {
    return <p className="empty-state">Nenhuma evidencia informada.</p>;
  }

  return (
    <ul className="submission-evidence-list">
      {evidences.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function FeedbackPanel({ feedback, status }) {
  if (!["reprovado", "ajuste"].includes(status)) {
    return null;
  }

  return (
    <div className="submission-feedback">
      <h3>Feedback do professor</h3>
      <p>{feedback || "Nenhum feedback informado pelo professor."}</p>
    </div>
  );
}

function SubmissionItem({ submission }) {
  return (
    <article className="submission-item">
      <header className="submission-item-header">
        <div>
          <h3>{submission.challengeTitle}</h3>
          <p>{submission.pillarName}</p>
        </div>
        <span className={statusClassName(submission.status)}>{submission.statusLabel}</span>
      </header>

      <dl className="submission-meta">
        <div>
          <dt>Data</dt>
          <dd>{formatDate(submission.createdAt)}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{submission.type === "grupo" ? "Grupo" : "Individual"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{submission.statusLabel}</dd>
        </div>
      </dl>

      <details className="submission-details">
        <summary>Ver detalhes</summary>
        <div className="submission-details-content">
          <div>
            <h3>Descricao</h3>
            <p>{submission.description || "Descricao nao informada."}</p>
          </div>
          <div>
            <h3>Evidencias</h3>
            <EvidenceList evidences={submission.evidences} />
          </div>
          <FeedbackPanel feedback={submission.feedback} status={submission.status} />
        </div>
      </details>
    </article>
  );
}

function SubmissionsList({ submissions }) {
  return (
    <DataList className="submission-list-panel" title="Historico de envios">
      <div className="submission-list">
        {submissions.map((submission) => (
          <SubmissionItem key={submission.id || `${submission.challengeTitle}-${submission.createdAt}`} submission={submission} />
        ))}
      </div>
    </DataList>
  );
}

export default function MeusDesafiosPage() {
  const [submissionsStatus, setSubmissionsStatus] = useState(
    createLoadingAsyncState("Carregando meus desafios...")
  );

  const loadSubmissions = useCallback(async () => {
    setSubmissionsStatus(createLoadingAsyncState("Carregando meus desafios..."));

    const result = await getMyChallengeSubmissions();

    setSubmissionsStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Voce ainda nao enviou desafios.",
        fallbackMessage: "Nao foi possivel carregar seus desafios.",
      })
    );
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();

    if (currentUser?.role && currentUser.role !== "aluno") {
      setSubmissionsStatus(createEmptyAsyncState("Meus desafios estao disponiveis apenas para alunos."));
      return;
    }

    loadSubmissions();
  }, [loadSubmissions]);

  const submissions = submissionsStatus.data || [];

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Aluno</p>
        <h1>Meus desafios</h1>
        <p>Acompanhe seus envios, status de avaliacao e feedback do professor.</p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando meus desafios..."
        onRetry={loadSubmissions}
        status={submissionsStatus}
      >
        <SubmissionsList submissions={submissions} />
      </AsyncStateView>

      <section className="inline-panel">
        <div>
          <h2>Novo envio</h2>
          <p>Registre um desafio realizado para iniciar uma nova avaliacao.</p>
        </div>
        <Button as={Link} href="/registrar-desafio">
          Registrar desafio
        </Button>
      </section>
    </main>
  );
}
