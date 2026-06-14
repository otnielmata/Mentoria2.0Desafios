"use client";

import { useCallback, useEffect, useState } from "react";
import { submitChallengeSubmission } from "@/controllers/challenge-submission.controller";
import { useFormController } from "@/controllers/form.controller";
import { getPillars } from "@/controllers/pillars.controller";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { createAsyncStateFromResult, createLoadingAsyncState } from "@/models/async-state.model";
import { initialChallengeSubmissionForm, submissionTypes } from "@/models/challenge-submission.model";
import { toPillarSelectOptions } from "@/models/pillars.model";
import { getCurrentUser } from "@/services/session.service";

export default function RegistrarDesafioPage() {
  const [pillarsStatus, setPillarsStatus] = useState(createLoadingAsyncState("Carregando pilares..."));
  const [user, setUser] = useState(null);
  const { form, handleSubmit, isSubmitting, status, updateField } = useFormController({
    initialValues: initialChallengeSubmissionForm,
    onSubmit: submitChallengeSubmission,
    successMessage: "Desafio enviado com status pendente.",
  });
  const isGroupSubmission = form.type === submissionTypes.group;
  const pillarOptions = toPillarSelectOptions(pillarsStatus.data || []);
  const isPillarSelectDisabled = isSubmitting || pillarsStatus.isLoading || pillarsStatus.isError || pillarsStatus.isEmpty;

  const loadPillars = useCallback(async () => {
    setPillarsStatus(createLoadingAsyncState("Carregando pilares..."));

    const result = await getPillars();

    setPillarsStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhum pilar cadastrado na API.",
        fallbackMessage: "Nao foi possivel carregar os pilares.",
      })
    );
  }, []);

  function getPillarHelpText() {
    if (pillarsStatus.isLoading) {
      return "Carregando pilares cadastrados na API.";
    }

    if (pillarsStatus.isError) {
      return "Nao foi possivel carregar os pilares da API.";
    }

    if (pillarsStatus.isEmpty) {
      return "Configure pilares na API antes de registrar desafios.";
    }

    return "Lista carregada dos pilares cadastrados na API.";
  }

  useEffect(() => {
    setUser(getCurrentUser());
    loadPillars();
  }, [loadPillars]);

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Aluno</p>
        <h1>Registrar desafio</h1>
        <p>Envie a execucao realizada para avaliacao do professor.</p>
      </section>

      <section className="submission-layout">
        <form aria-busy={isSubmitting} className="form-panel form-stack" noValidate onSubmit={handleSubmit}>
          <div className="field-grid">
            <Select
              label="Pilar"
              name="pilarId"
              value={form.pilarId}
              onChange={updateField}
              disabled={isPillarSelectDisabled}
              error={status.fieldErrors.pilarId}
              helpText={getPillarHelpText()}
              required
            >
              <option value="">Selecione</option>
              {pillarOptions.map((pillar) => (
                <option key={pillar.value} value={pillar.value}>
                  {pillar.label}
                </option>
              ))}
            </Select>

            <Input
              label="Desafio realizado"
              name="desafioId"
              value={form.desafioId}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.desafioId}
              placeholder="Identificacao do desafio"
              required
            />
          </div>

          <div className="field-grid">
            <Input
              label="Turma"
              name="turmaId"
              value={form.turmaId}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.turmaId}
              placeholder="Identificacao da turma"
              required
            />

            <Select
              label="Tipo de envio"
              name="type"
              value={form.type}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.type}
              required
            >
              <option value={submissionTypes.individual}>Individual</option>
              <option value={submissionTypes.group}>Grupo</option>
            </Select>
          </div>

          {isGroupSubmission ? (
            <Textarea
              label="Participantes do grupo"
              name="participants"
              value={form.participants}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.participants}
              helpText="Informe ate 5 participantes, separados por virgula ou linha."
              rows={4}
              required
            />
          ) : null}

          <Textarea
            label="Descricao do que foi feito"
            name="description"
            value={form.description}
            onChange={updateField}
            disabled={isSubmitting}
            error={status.fieldErrors.description}
            rows={5}
            required
          />

          <Textarea
            label="Evidencia, link ou comprovante"
            name="evidence"
            value={form.evidence}
            onChange={updateField}
            disabled={isSubmitting}
            error={status.fieldErrors.evidence}
            rows={3}
            required
          />

          <Alert type={status.type}>{status.message}</Alert>

          {pillarsStatus.isError ? (
            <Button onClick={loadPillars} type="button" variant="secondary">
              Tentar carregar pilares
            </Button>
          ) : null}

          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar para aprovacao"}
          </Button>
        </form>

        <aside className="submission-summary" aria-label="Resumo do envio">
          <span className="status-pill">Pendente</span>
          <h2>Responsavel pelo envio</h2>
          <p>{user?.name || "Aluno autenticado"}</p>
          <dl>
            <div>
              <dt>Status inicial</dt>
              <dd>Pendente</dd>
            </div>
            <div>
              <dt>Pontuacao</dt>
              <dd>Apenas apos aprovacao</dd>
            </div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
