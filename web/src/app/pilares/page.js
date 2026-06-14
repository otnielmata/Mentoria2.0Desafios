"use client";

import { useCallback, useEffect, useState } from "react";
import { getPillars } from "@/controllers/pillars.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import DataList from "@/components/ui/DataList";
import {
  createAsyncStateFromResult,
  createLoadingAsyncState,
} from "@/models/async-state.model";
import { hasAllMethodPillars, methodPillarNames } from "@/models/pillars.model";

function PillarItem({ pillar }) {
  return (
    <article className="pillar-item">
      <header>
        <div>
          <h3>{pillar.name}</h3>
          <p>{pillar.description || "Descricao nao informada pela API."}</p>
        </div>
        <span className="status-pill">{pillar.status || "ativo"}</span>
      </header>

      <details className="pillar-details">
        <summary>Ver detalhes</summary>
        <p>{pillar.description || "Este pilar ainda nao possui descricao cadastrada na API."}</p>
      </details>
    </article>
  );
}

function PillarsCoverage({ pillars }) {
  const hasSevenPillars = hasAllMethodPillars(pillars);

  return (
    <section className="inline-panel" aria-label="Cobertura dos pilares">
      <div>
        <h2>{pillars.length} de {methodPillarNames.length} pilares carregados</h2>
        <p>
          {hasSevenPillars
            ? "A API retornou os 7 topicos principais do Metodo do Alavanque."
            : "Confira a configuracao inicial dos pilares na API/admin."}
        </p>
      </div>
      <span className="status-pill">{hasSevenPillars ? "Completo" : "Revisar"}</span>
    </section>
  );
}

function PillarsList({ pillars }) {
  return (
    <div className="content-layout">
      <PillarsCoverage pillars={pillars} />

      <DataList className="pillar-list-panel" title="Pilares cadastrados">
        <div className="pillar-list">
          {pillars.map((pillar) => (
            <PillarItem key={pillar.id || pillar.name} pillar={pillar} />
          ))}
        </div>
      </DataList>
    </div>
  );
}

export default function PilaresPage() {
  const [pillarsStatus, setPillarsStatus] = useState(createLoadingAsyncState("Carregando pilares..."));

  const loadPillars = useCallback(async () => {
    setPillarsStatus(createLoadingAsyncState("Carregando pilares..."));

    const result = await getPillars();

    setPillarsStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhum pilar cadastrado. Configure os 7 pilares iniciais pela API/admin.",
        fallbackMessage: "Nao foi possivel carregar os pilares.",
      })
    );
  }, []);

  useEffect(() => {
    loadPillars();
  }, [loadPillars]);

  const pillars = pillarsStatus.data || [];

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Admin</p>
        <h1>Pilares</h1>
        <p>Consulte os topicos do Metodo do Alavanque usados para classificar desafios.</p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando pilares..."
        onRetry={loadPillars}
        status={pillarsStatus}
      >
        <PillarsList pillars={pillars} />
      </AsyncStateView>
    </main>
  );
}
