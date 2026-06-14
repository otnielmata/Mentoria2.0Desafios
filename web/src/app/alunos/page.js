"use client";

import { useCallback, useEffect, useState } from "react";
import { createUser, getUsers } from "@/controllers/users.controller";
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
import { initialUserForm, userRoleOptions, userStatusOptions } from "@/models/users.model";

function StudentItem({ student }) {
  return (
    <article className="student-item">
      <header>
        <div>
          <h3>{student.name}</h3>
          <p>{student.email}</p>
        </div>
        <span className={`student-status student-status-${student.status}`}>{student.statusLabel}</span>
      </header>

      <dl className="student-meta">
        <div>
          <dt>Papel</dt>
          <dd>{student.roleLabel}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{student.statusLabel}</dd>
        </div>
        <div>
          <dt>Turma</dt>
          <dd>{student.turma || "Turma nao informada"}</dd>
        </div>
      </dl>
    </article>
  );
}

function StudentsList({ students }) {
  return (
    <DataList className="student-list-panel" title="Alunos cadastrados">
      <div className="student-list">
        {students.map((student) => (
          <StudentItem key={student.id || student.email} student={student} />
        ))}
      </div>
    </DataList>
  );
}

export default function AlunosPage() {
  const [usersStatus, setUsersStatus] = useState(createLoadingAsyncState("Carregando alunos..."));

  const loadUsers = useCallback(async () => {
    setUsersStatus(createLoadingAsyncState("Carregando alunos..."));

    const result = await getUsers();

    setUsersStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhum aluno cadastrado.",
        fallbackMessage: "Nao foi possivel carregar os alunos.",
      })
    );
  }, []);

  const { form, handleSubmit, isSubmitting, status, updateField } = useFormController({
    initialValues: initialUserForm,
    onSubmit: createUser,
    onSuccess: async (_, { resetForm }) => {
      resetForm();
      await loadUsers();
    },
    successMessage: "Aluno cadastrado com sucesso.",
  });

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const students = usersStatus.data || [];

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Admin</p>
        <h1>Alunos</h1>
        <p>Cadastre e consulte participantes da mentoria com os dados essenciais do usuario.</p>
      </section>

      <section className="management-layout">
        <form
          aria-busy={isSubmitting}
          aria-label="Cadastro de aluno"
          className="form-panel form-stack"
          noValidate
          onSubmit={handleSubmit}
        >
          <h2>Cadastrar aluno</h2>

          <div className="field-grid">
            <Input
              label="Nome"
              name="name"
              value={form.name}
              onChange={updateField}
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
              disabled={isSubmitting}
              error={status.fieldErrors.email}
              required
            />
          </div>

          <div className="field-grid">
            <Select
              label="Papel"
              name="role"
              value={form.role}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.role}
              required
            >
              {userRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              label="Status"
              name="status"
              value={form.status}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.status}
              required
            >
              {userStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <Alert type={status.type}>{status.message}</Alert>

          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar aluno"}
          </Button>
        </form>

        <AsyncStateView
          errorActionLabel="Tentar novamente"
          loadingMessage="Carregando alunos..."
          onRetry={loadUsers}
          status={usersStatus}
        >
          <StudentsList students={students} />
        </AsyncStateView>
      </section>
    </main>
  );
}
