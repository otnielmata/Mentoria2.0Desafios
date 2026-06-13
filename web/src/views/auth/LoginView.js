import Link from "next/link";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginView({
  form,
  isSubmitting,
  onChange,
  onSubmit,
  status,
}) {
  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <p className="eyebrow">Acesso</p>
        <h1>Entrar no painel</h1>
        <form className="form-stack" onSubmit={onSubmit}>
          <Input
            label="E-mail"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            autoComplete="email"
            required
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            autoComplete="current-password"
            required
          />
          <Alert type={status.type}>{status.message}</Alert>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="muted-link">
          Ainda nao tem conta? <Link href="/registro">Registrar usuario</Link>
        </p>
      </section>
    </main>
  );
}
