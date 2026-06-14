"use client";

import { useCallback, useEffect, useState } from "react";
import { createClass, getClasses } from "@/controllers/classes.controller";
import { useFormController } from "@/controllers/form.controller";
import Alert from "@/components/ui/Alert";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import {
  createAsyncStateFromResult,
  createLoadingAsyncState,
} from "@/models/async-state.model";
import { classStatusOptions, initialClassForm } from "@/models/classes.model";

function formatDate(value) {
  if (!value) {
    return "Data nao informada";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function ClassItem({ turma }) {
  return (
    <article className="class-item">
      <header>
        <div>
          <h3>{turma.name}</h3>
          <p>{formatDate(turma.startDate)} ate {formatDate(turma.endDate)}</p>
        </div>
        <span className={`class-status class-status-${turma.status}`}>{turma.statusLabel}</span>
      </header>

      <dl className="class-meta">
        <div>
          <dt>Data de inicio</dt>
          <dd>{formatDate(turma.startDate)}</dd>
        </div>
        <div>
          <dt>Data de fim</dt>
          <dd>{formatDate(turma.endDate)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{turma.statusLabel}</dd>
        </div>
      </dl>
    </article>
  );
}

function ClassesList({ classes }) {
  return (
    <DataList className="class-list-panel" title="Turmas cadastradas">
      <div className="class-list">
        {classes.map((turma) => (
          <ClassItem key={turma.id || `${turma.name}-${turma.startDate}`} turma={turma} />
        ))}
      </div>
    </DataList>
  );
}

export default function TurmasPage() {
  const [classesStatus, setClassesStatus] = useState(createLoadingAsyncState("Carregando turmas..."));

  const loadClasses = useCallback(async () => {
    setClassesStatus(createLoadingAsyncState("Carregando turmas..."));

    const result = await getClasses();

    setClassesStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhuma turma cadastrada.",
        fallbackMessage: "Nao foi possivel carregar as turmas.",
      })
    );
  }, []);

  const { form, handleSubmit, isSubmitting, status, updateField } = useFormController({
    initialValues: initialClassForm,
    onSubmit: createClass,
    onSuccess: async (_, { resetForm }) => {
      resetForm();
      await loadClasses();
    },
    successMessage: "Turma cadastrada com sucesso.",
  });

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const classes = classesStatus.data || [];

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Admin</p>
        <h1>Turmas</h1>
        <p>Organize ciclos da mentoria por nome, periodo e status.</p>
      </section>

      <section className="management-layout">
        <form
          aria-busy={isSubmitting}
          aria-label="Cadastro de turma"
          className="form-panel form-stack"
          noValidate
          onSubmit={handleSubmit}
        >
          <h2>Cadastrar turma</h2>

          <Input
            label="Nome"
            name="name"
            value={form.name}
            onChange={updateField}
            disabled={isSubmitting}
            error={status.fieldErrors.name}
            required
          />

          <div className="field-grid">
            <Input
              label="Data de inicio"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.startDate}
              required
            />

            <Input
              label="Data de fim"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.endDate}
              required
            />
          </div>

          <Select
            label="Status"
            name="status"
            value={form.status}
            onChange={updateField}
            disabled={isSubmitting}
            error={status.fieldErrors.status}
            required
          >
            {classStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Alert type={status.type}>{status.message}</Alert>

          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar turma"}
          </Button>
        </form>

        <AsyncStateView
          errorActionLabel="Tentar novamente"
          loadingMessage="Carregando turmas..."
          onRetry={loadClasses}
          status={classesStatus}
        >
          <ClassesList classes={classes} />
        </AsyncStateView>
      </section>
    </main>
  );
}
