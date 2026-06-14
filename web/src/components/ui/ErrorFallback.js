import Button from "@/components/ui/Button";

export default function ErrorFallback({
  message = "Tente novamente em instantes. Se o problema continuar, acesse novamente pelo menu principal.",
  onRetry,
  title = "Nao foi possivel carregar esta area.",
}) {
  return (
    <main className="error-fallback-screen">
      <section className="feedback-state feedback-error error-fallback-panel" role="alert">
        <p className="eyebrow">Erro inesperado</p>
        <h1>{title}</h1>
        <p>{message}</p>
        {onRetry ? (
          <Button onClick={onRetry} type="button" variant="secondary">
            Tentar novamente
          </Button>
        ) : null}
      </section>
    </main>
  );
}
