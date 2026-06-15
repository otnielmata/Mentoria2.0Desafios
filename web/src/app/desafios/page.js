"use client";

import { useCallback, useEffect, useState } from "react";
import { createChallenge, getChallenges } from "@/controllers/challenges.controller";
import { useFormController } from "@/controllers/form.controller";
import { getPillars } from "@/controllers/pillars.controller";
import Alert from "@/components/ui/Alert";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import {
  createAsyncStateFromResult,
  createLoadingAsyncState,
} from "@/models/async-state.model";
import {
  challengeStatusOptions,
  challengeTypeOptions,
  initialChallengeForm,
} from "@/models/challenges.model";
import { toPillarSelectOptions } from "@/models/pillars.model";

function ChallengeItem({ challenge }) {
  return (
    <article className="admin-challenge-item">
      <header>
        <div>
          <h3>{challenge.title}</h3>
          <p>{challenge.pillarName}</p>
        </div>
        <span className={`admin-challenge-status admin-challenge-status-${challenge.status}`}>
          {challenge.statusLabel}
        </span>
      </header>

      <dl className="admin-challenge-meta">
        <div>
          <dt>Pontos</dt>
          <dd>{challenge.points}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{challenge.typeLabel}</dd>
        </div>
        <div>
          <dt>Maximo</dt>
          <dd>{challenge.maxParticipants}</dd>
        </div>
      </dl>

      <details className="admin-challenge-details">
        <summary>Ver descricao</summary>
        <p>{challenge.description || "Descricao nao informada."}</p>
      </details>
    </article>
  );
}

function ChallengesList({ challenges }) {
  return (
    <DataList className="admin-challenge-list-panel" title="Desafios cadastrados">
      <div className="admin-challenge-list">
        {challenges.map((challenge) => (
          <ChallengeItem key={challenge.id || `${challenge.title}-${challenge.pillarName}`} challenge={challenge} />
        ))}
      </div>
    </DataList>
  );
}

export default function DesafiosPage() {
  const [challengesStatus, setChallengesStatus] = useState(createLoadingAsyncState("Carregando desafios..."));
  const [pillarsStatus, setPillarsStatus] = useState(createLoadingAsyncState("Carregando pilares..."));
  const pillarOptions = toPillarSelectOptions(pillarsStatus.data || []);
  const isPillarSelectDisabled =
    pillarsStatus.isLoading || pillarsStatus.isError || pillarsStatus.isEmpty;

  const loadChallenges = useCallback(async () => {
    setChallengesStatus(createLoadingAsyncState("Carregando desafios..."));

    const result = await getChallenges();

    setChallengesStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhum desafio cadastrado.",
        fallbackMessage: "Nao foi possivel carregar os desafios.",
      })
    );
  }, []);

  const loadPillars = useCallback(async () => {
    setPillarsStatus(createLoadingAsyncState("Carregando pilares..."));

    const result = await getPillars();

    setPillarsStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Cadastre os pilares antes de criar desafios.",
        fallbackMessage: "Nao foi possivel carregar os pilares.",
      })
    );
  }, []);

  const { form, handleSubmit, isSubmitting, status, updateField } = useFormController({
    initialValues: initialChallengeForm,
    onSubmit: createChallenge,
    onSuccess: async (_, { resetForm }) => {
      resetForm();
      await loadChallenges();
    },
    successMessage: "Desafio cadastrado com sucesso.",
  });

  function getPillarHelpText() {
    if (pillarsStatus.isLoading) {
      return "Carregando pilares cadastrados na API.";
    }

    if (pillarsStatus.isError) {
      return "Nao foi possivel carregar os pilares da API.";
    }

    if (pillarsStatus.isEmpty) {
      return "Cadastre pilares antes de criar desafios.";
    }

    return "Lista carregada dos pilares cadastrados na API.";
  }

  useEffect(() => {
    loadChallenges();
    loadPillars();
  }, [loadChallenges, loadPillars]);

  const challenges = challengesStatus.data || [];

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Admin</p>
        <h1>Desafios</h1>
        <p>Cadastre acoes da mentoria com pilar, tipo e pontuacao fixa.</p>
      </section>

      <section className="management-layout">
        <form
          aria-busy={isSubmitting}
          aria-label="Cadastro de desafio"
          className="form-panel form-stack"
          noValidate
          onSubmit={handleSubmit}
        >
          <h2>Cadastrar desafio</h2>

          <Select
            label="Pilar"
            name="pillarId"
            value={form.pillarId}
            onChange={updateField}
            disabled={isSubmitting || isPillarSelectDisabled}
            error={status.fieldErrors.pillarId}
            helpText={getPillarHelpText()}
            required
          >
            <option value="">Selecione</option>
            {pillarOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Input
            label="Titulo"
            name="title"
            value={form.title}
            onChange={updateField}
            disabled={isSubmitting}
            error={status.fieldErrors.title}
            required
          />

          <Textarea
            label="Descricao"
            name="description"
            value={form.description}
            onChange={updateField}
            disabled={isSubmitting}
            error={status.fieldErrors.description}
            rows={4}
            required
          />

          <div className="field-grid">
            <Input
              label="Pontos"
              name="points"
              type="number"
              min="1"
              value={form.points}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.points}
              required
            />

            <Input
              label="Maximo de participantes"
              name="maxParticipants"
              type="number"
              min="1"
              max="5"
              value={form.maxParticipants}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.maxParticipants}
              required
            />
          </div>

          <div className="field-grid">
            <Select
              label="Tipo"
              name="type"
              value={form.type}
              onChange={updateField}
              disabled={isSubmitting}
              error={status.fieldErrors.type}
              required
            >
              {challengeTypeOptions.map((option) => (
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
              {challengeStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <Alert type={status.type}>{status.message}</Alert>

          {pillarsStatus.isError ? (
            <Button onClick={loadPillars} type="button" variant="secondary">
              Tentar carregar pilares
            </Button>
          ) : null}

          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Salvando..." : "Salvar desafio"}
          </Button>
        </form>

        <AsyncStateView
          errorActionLabel="Tentar novamente"
          loadingMessage="Carregando desafios..."
          onRetry={loadChallenges}
          status={challengesStatus}
        >
          <ChallengesList challenges={challenges} />
        </AsyncStateView>
      </section>
    </main>
  );
}
