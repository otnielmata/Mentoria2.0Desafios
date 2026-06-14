"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/controllers/auth.controller";
import { useFormController } from "@/controllers/form.controller";
import { resolvePostLoginRedirect } from "@/config/access-control";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const initialForm = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const { form, handleSubmit, isSubmitting, status, updateField } = useFormController({
    initialValues: initialForm,
    onSubmit: login,
    onSuccess: () => {
      const redirectPath = new URLSearchParams(window.location.search).get("redirect");
      router.push(resolvePostLoginRedirect(redirectPath));
    },
    sensitiveFields: ["password"],
    shouldClearSensitiveFields: (result) => result.type !== "validation",
  });

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <p className="eyebrow">Acesso</p>
        <h1>Entrar no painel</h1>
        <form aria-busy={isSubmitting} className="form-stack" noValidate onSubmit={handleSubmit}>
          <Input
            label="E-mail"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
            disabled={isSubmitting}
            error={status.fieldErrors.email}
            required
          />
          <Input
            label="Senha"
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            autoComplete="current-password"
            disabled={isSubmitting}
            error={status.fieldErrors.password}
            required
          />
          <Alert type={status.type}>{status.message}</Alert>
          <Button type="submit" isLoading={isSubmitting}>
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
