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
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });

    const result = await login(form);
    setSubmitting(false);

    if (!result.ok) {
      setStatus({ type: "error", message: result.message });
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <p className="eyebrow">Acesso</p>
        <h1>Entrar no painel</h1>
        <form className="form-stack" onSubmit={handleSubmit}>
          <Input
            label="E-mail"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            autoComplete="email"
            required
          />
          <Input
            label="Senha"
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
