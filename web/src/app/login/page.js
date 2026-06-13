"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/controllers/auth.controller";
import LoginView from "@/views/auth/LoginView";

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
    <LoginView
      form={form}
      isSubmitting={isSubmitting}
      onChange={updateField}
      onSubmit={handleSubmit}
      status={status}
    />
  );
}
