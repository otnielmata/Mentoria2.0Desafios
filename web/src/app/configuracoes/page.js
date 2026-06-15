"use client";

import { useCallback, useEffect, useState } from "react";
import { getConfigurations } from "@/controllers/configurations.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import DataList from "@/components/ui/DataList";
import {
  createAsyncStateFromResult,
  createEmptyAsyncState,
  createLoadingAsyncState,
} from "@/models/async-state.model";

function ConfigurationSummary({ configurations }) {
  const metrics = [
    {
      label: "Modo da tela",
      value: configurations.readOnly ? "Somente leitura" : "Editavel",
    },
    {
      label: "Edicao",
      value: configurations.editingEnabled ? "Disponivel" : "Indisponivel",
    },
    {
      label: "Ranking geral",
      value: configurations.rankingVisibility.label,
    },
  ];

  return (
    <section className="dashboard-grid configuration-summary-grid" aria-label="Resumo de configuracoes">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <span>{metric.value}</span>
          <p>{metric.label}</p>
        </article>
      ))}
    </section>
  );
}

function ConfigurationItem({ parameter }) {
  return (
    <article className="configuration-item">
      <header>
        <div>
          <h3>{parameter.name}</h3>
          <p>{parameter.description || "Parametro funcional da aplicacao."}</p>
        </div>
        <span className="status-pill">{parameter.statusLabel}</span>
      </header>

      <dl className="configuration-meta">
        <div>
          <dt>Valor</dt>
          <dd>{parameter.valueLabel}</dd>
        </div>
        <div>
          <dt>Tipo</dt>
          <dd>{parameter.type}</dd>
        </div>
      </dl>
    </article>
  );
}

function ConfigurationList({ configurations }) {
  return (
    <DataList className="configuration-list-panel" title="Parametros disponiveis">
      <div className="configuration-list">
        {configurations.parameters.map((parameter) => (
          <ConfigurationItem key={parameter.id} parameter={parameter} />
        ))}
      </div>
    </DataList>
  );
}

function ConfigurationsContent({ configurations }) {
  return (
    <>
      <ConfigurationSummary configurations={configurations} />
      <ConfigurationList configurations={configurations} />
    </>
  );
}

export default function ConfiguracoesPage() {
  const [configurationsStatus, setConfigurationsStatus] = useState(
    createLoadingAsyncState("Carregando configuracoes...")
  );

  const loadConfigurations = useCallback(async () => {
    setConfigurationsStatus(createLoadingAsyncState("Carregando configuracoes..."));

    const result = await getConfigurations();

    if (result.ok && result.data.isEmpty) {
      setConfigurationsStatus(createEmptyAsyncState("Nenhuma configuracao disponivel para exibicao."));
      return;
    }

    setConfigurationsStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhuma configuracao disponivel para exibicao.",
        fallbackMessage: "Nao foi possivel carregar as configuracoes.",
      })
    );
  }, []);

  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  const configurations = configurationsStatus.data;

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Admin</p>
        <h1>Configuracoes</h1>
        <p>Consulte parametros iniciais da aplicacao sem expor regras tecnicas ou segredos.</p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando configuracoes..."
        onRetry={loadConfigurations}
        status={configurationsStatus}
      >
        {configurations ? <ConfigurationsContent configurations={configurations} /> : null}
      </AsyncStateView>
    </main>
  );
}
