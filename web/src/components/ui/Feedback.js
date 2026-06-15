import Button from "@/components/ui/Button";

export function LoadingState({ message = "Carregando informacoes..." }) {
  return (
    <div aria-busy="true" className="feedback-state feedback-loading" role="status">
      <span aria-hidden="true" className="feedback-spinner" />
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ actionLabel = "", message, onAction }) {
  return (
    <div className="feedback-state feedback-error" role="alert">
      <p>{message}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} type="button" variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ actionLabel = "", children, onAction }) {
  return (
    <div className="feedback-state feedback-empty" role="status">
      <p>{children}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} type="button" variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function AsyncStateView({
  children,
  emptyMessage = "Nenhum registro encontrado.",
  errorActionLabel = "Tentar novamente",
  loadingMessage = "Carregando informacoes...",
  onRetry,
  status,
}) {
  if (status?.state === "loading") {
    return <LoadingState message={status.message || loadingMessage} />;
  }

  if (status?.state === "error") {
    return (
      <ErrorState
        actionLabel={status.canRetry ? errorActionLabel : ""}
        message={status.message || "Nao foi possivel carregar as informacoes."}
        onAction={status.canRetry ? onRetry : undefined}
      />
    );
  }

  if (status?.state === "empty") {
    return <EmptyState>{status.message || emptyMessage}</EmptyState>;
  }

  return children;
}
