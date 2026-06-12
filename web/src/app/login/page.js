"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/controllers/auth.controller";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const initialForm = {
  email: "",
  password: "",
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((current) => ({
        ...current,
        [name]: "",
      }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setStatus({ type: "", message: "" });

    const result = await login(form);
    setSubmitting(false);

    if (!result.ok) {
      setFieldErrors(result.fieldErrors || {});
      setStatus({ type: "error", message: result.message });

      if (result.status) {
        setForm((current) => ({ ...current, password: "" }));
      }

      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <p className="eyebrow">Acesso</p>
        <h1>Entrar no painel</h1>
        <form aria-busy={isSubmitting} className="form-stack" noValidate onSubmit={handleSubmit}>
          <Input
            error={fieldErrors.email}
            label="E-mail"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
            required
          />
          <Input
            error={fieldErrors.password}
            label="Senha"
            minLength={6}
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
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
