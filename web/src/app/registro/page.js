"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/controllers/auth.controller";
import { useFormController } from "@/controllers/form.controller";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const initialForm = {
  name: "",
  email: "",
  password: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const { form, handleSubmit, isSubmitting, status, updateField } = useFormController({
    initialValues: initialForm,
    onSubmit: register,
    onSuccess: () => router.push("/dashboard"),
    sensitiveFields: ["password"],
    shouldClearSensitiveFields: (result) => result.type !== "validation",
  });

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <p className="eyebrow">Novo acesso</p>
        <h1>Registrar usuario</h1>
        <form aria-busy={isSubmitting} className="form-stack" noValidate onSubmit={handleSubmit}>
          <Input
            label="Nome"
            name="name"
            value={form.name}
            onChange={updateField}
            autoComplete="name"
            disabled={isSubmitting}
            error={status.fieldErrors.name}
            required
          />
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
            autoComplete="new-password"
            disabled={isSubmitting}
            error={status.fieldErrors.password}
            required
          />
          <Alert type={status.type}>{status.message}</Alert>
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar"}
          </Button>
        </form>
        <p className="muted-link">
          Ja possui conta? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
