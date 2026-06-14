"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getChallengeApprovals,
  reviewChallengeApproval,
} from "@/controllers/challenge-approvals.controller";
import Alert from "@/components/ui/Alert";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import Textarea from "@/components/ui/Textarea";
import {
  createAsyncStateFromResult,
  createLoadingAsyncState,
} from "@/models/async-state.model";
import { approvalActions } from "@/models/challenge-approvals.model";
import {
  createIdleFormStatus,
  createLoadingFormStatus,
  createStatusAfterFieldChange,
  createStatusFromResult,
} from "@/models/form.model";

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

function isExternalReference(value = "") {
  return /^https?:\/\//i.test(value);
}

function EvidenceList({ evidences }) {
  if (!evidences.length) {
    return <p className="empty-state">Nenhuma evidencia informada.</p>;
  }

  return (
    <ul className="approval-evidence-list">
      {evidences.map((item) => (
        <li key={item}>
          {isExternalReference(item) ? (
            <a href={item} rel="noreferrer" target="_blank">
              Abrir evidencia
            </a>
          ) : (
            item
          )}
        </li>
      ))}
    </ul>
  );
}

function getFeedbackError({ reviewContext, reviewStatus, submissionId }) {
  if (reviewContext.submissionId !== submissionId) {
    return "";
  }

  return reviewStatus.fieldErrors.feedback || "";
}

function isActionLoading({ action, reviewContext, reviewStatus, submissionId }) {
  return (
    reviewStatus.state === "loading" &&
    reviewContext.submissionId === submissionId &&
    reviewContext.action === action
  );
}

function ApprovalItem({
  feedback,
  onFeedbackChange,
  onReview,
  reviewContext,
  reviewStatus,
  submission,
}) {
  const feedbackError = getFeedbackError({
    reviewContext,
    reviewStatus,
    submissionId: submission.id,
  });
  const isReviewingCurrentSubmission =
    reviewStatus.state === "loading" && reviewContext.submissionId === submission.id;

  return (
    <article className="approval-item">
      <header className="approval-item-header">
        <div>
          <h3>{submission.challengeTitle}</h3>
          <p>{submission.studentName}</p>
        </div>
        <span className={`submission-status submission-status-${submission.status}`}>
          {submission.statusLabel}
        </span>
      </header>

      <dl className="approval-meta">
        <div>
          <dt>Aluno</dt>
          <dd>{submission.studentName}</dd>
        </div>
        <div>
          <dt>Pilar</dt>
          <dd>{submission.pillarName}</dd>
        </div>
        <div>
          <dt>Pontos</dt>
          <dd>{submission.points}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{submission.type === "grupo" ? "Grupo" : "Individual"}</dd>
        </div>
        <div>
          <dt>Turma</dt>
          <dd>{submission.className || "Nao informada"}</dd>
        </div>
        <div>
          <dt>Envio</dt>
          <dd>{formatDate(submission.createdAt)}</dd>
        </div>
      </dl>

      <details className="approval-details">
        <summary>Analisar descricao e evidencias</summary>
        <div className="approval-details-content">
          <section>
            <h4>Descricao</h4>
            <p>{submission.description || "Descricao nao informada."}</p>
          </section>
          <section>
            <h4>Evidencias</h4>
            <EvidenceList evidences={submission.evidences} />
          </section>
        </div>
      </details>

      <div className="approval-review-panel">
        <Textarea
          label="Feedback para o aluno"
          name={`feedback-${submission.id}`}
          value={feedback}
          onChange={(event) => onFeedbackChange(submission.id, event.target.value)}
          disabled={isReviewingCurrentSubmission}
          error={feedbackError}
          helpText="Obrigatorio para solicitar ajuste. Recomendado ao reprovar."
          rows={3}
        />

        <div className="approval-actions" aria-label={`Acoes para ${submission.challengeTitle}`}>
          <Button
            type="button"
            onClick={() => onReview(submission.id, approvalActions.approve)}
            disabled={isReviewingCurrentSubmission}
            isLoading={isActionLoading({
              action: approvalActions.approve,
              reviewContext,
              reviewStatus,
              submissionId: submission.id,
            })}
          >
            Aprovar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onReview(submission.id, approvalActions.reject)}
            disabled={isReviewingCurrentSubmission}
            isLoading={isActionLoading({
              action: approvalActions.reject,
              reviewContext,
              reviewStatus,
              submissionId: submission.id,
            })}
          >
            Reprovar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onReview(submission.id, approvalActions.adjustment)}
            disabled={isReviewingCurrentSubmission}
            isLoading={isActionLoading({
              action: approvalActions.adjustment,
              reviewContext,
              reviewStatus,
              submissionId: submission.id,
            })}
          >
            Solicitar ajuste
          </Button>
        </div>
      </div>
    </article>
  );
}

function ApprovalsList({
  approvals,
  feedbackBySubmissionId,
  onFeedbackChange,
  onReview,
  reviewContext,
  reviewStatus,
}) {
  return (
    <DataList className="approval-list-panel" title="Envios pendentes">
      <div className="approval-list">
        {approvals.map((submission) => (
          <ApprovalItem
            feedback={feedbackBySubmissionId[submission.id] || ""}
            key={submission.id || `${submission.challengeTitle}-${submission.studentName}`}
            onFeedbackChange={onFeedbackChange}
            onReview={onReview}
            reviewContext={reviewContext}
            reviewStatus={reviewStatus}
            submission={submission}
          />
        ))}
      </div>
    </DataList>
  );
}

export default function AprovacoesPage() {
  const [approvalsStatus, setApprovalsStatus] = useState(
    createLoadingAsyncState("Carregando envios pendentes...")
  );
  const [feedbackBySubmissionId, setFeedbackBySubmissionId] = useState({});
  const [reviewContext, setReviewContext] = useState({ action: "", submissionId: "" });
  const [reviewStatus, setReviewStatus] = useState(createIdleFormStatus());

  const loadApprovals = useCallback(async () => {
    setApprovalsStatus(createLoadingAsyncState("Carregando envios pendentes..."));

    const result = await getChallengeApprovals();

    setApprovalsStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhum envio pendente de aprovacao.",
        fallbackMessage: "Nao foi possivel carregar as aprovacoes.",
      })
    );
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  function handleFeedbackChange(submissionId, value) {
    setFeedbackBySubmissionId((current) => ({
      ...current,
      [submissionId]: value,
    }));

    if (reviewContext.submissionId === submissionId) {
      setReviewStatus((current) => createStatusAfterFieldChange(current, "feedback"));
    }
  }

  async function handleReview(submissionId, action) {
    const feedback = feedbackBySubmissionId[submissionId] || "";

    setReviewContext({ action, submissionId });
    setReviewStatus(createLoadingFormStatus("Atualizando envio..."));

    const result = await reviewChallengeApproval({
      action,
      feedback,
      submissionId,
    });

    setReviewStatus(createStatusFromResult(result));

    if (result.ok) {
      setFeedbackBySubmissionId((current) => {
        const next = { ...current };
        delete next[submissionId];

        return next;
      });
      await loadApprovals();
    }
  }

  const approvals = approvalsStatus.data || [];

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Admin</p>
        <h1>Aprovacoes</h1>
        <p>Analise envios pendentes antes da pontuacao entrar no ranking.</p>
      </section>

      <Alert type={reviewStatus.type}>{reviewStatus.message}</Alert>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando envios pendentes..."
        onRetry={loadApprovals}
        status={approvalsStatus}
      >
        <ApprovalsList
          approvals={approvals}
          feedbackBySubmissionId={feedbackBySubmissionId}
          onFeedbackChange={handleFeedbackChange}
          onReview={handleReview}
          reviewContext={reviewContext}
          reviewStatus={reviewStatus}
        />
      </AsyncStateView>
    </main>
  );
}
