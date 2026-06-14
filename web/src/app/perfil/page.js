"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getProfile } from "@/controllers/profile.controller";
import { AsyncStateView } from "@/components/ui/Feedback";
import Button from "@/components/ui/Button";
import DataList from "@/components/ui/DataList";
import {
  createAsyncStateFromResult,
  createLoadingAsyncState,
} from "@/models/async-state.model";

function ProfileField({ label, value }) {
  return (
    <div className="profile-field">
      <dt>{label}</dt>
      <dd>{value || "Nao informado"}</dd>
    </div>
  );
}

function ProfileTurmas({ turmas }) {
  if (!turmas.length) {
    return <p className="empty-state">Nenhuma turma vinculada ao perfil.</p>;
  }

  return (
    <ul className="profile-tag-list">
      {turmas.map((turma) => (
        <li key={turma}>{turma}</li>
      ))}
    </ul>
  );
}

function ProfileContent({ profile }) {
  return (
    <>
      <DataList className="profile-panel" title="Dados cadastrais">
        <dl className="profile-grid">
          <ProfileField label="Nome" value={profile.name} />
          <ProfileField label="E-mail" value={profile.email} />
          <ProfileField label="Perfil" value={profile.roleLabel} />
          <ProfileField label="Status" value={profile.status} />
        </dl>
      </DataList>

      <DataList title="Turmas">
        <ProfileTurmas turmas={profile.turmas} />
      </DataList>
    </>
  );
}

export default function PerfilPage() {
  const [profileStatus, setProfileStatus] = useState(
    createLoadingAsyncState("Carregando meu perfil...")
  );

  const loadProfile = useCallback(async () => {
    setProfileStatus(createLoadingAsyncState("Carregando meu perfil..."));

    const result = await getProfile();

    setProfileStatus(
      createAsyncStateFromResult(result, {
        emptyMessage: "Nenhum dado de perfil encontrado.",
        fallbackMessage: "Nao foi possivel carregar seu perfil.",
      })
    );
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const profile = profileStatus.data;

  return (
    <main className="content-layout">
      <section className="section-header">
        <p className="eyebrow">Conta</p>
        <h1>Meu perfil</h1>
        <p>Confira seus dados cadastrais e o perfil de acesso usado na mentoria.</p>
      </section>

      <AsyncStateView
        errorActionLabel="Tentar novamente"
        loadingMessage="Carregando meu perfil..."
        onRetry={loadProfile}
        status={profileStatus}
      >
        {profile ? <ProfileContent profile={profile} /> : null}
      </AsyncStateView>

      <section className="inline-panel">
        <div>
          <h2>Desafios</h2>
          <p>Acesse seus envios para acompanhar avaliacoes e progresso.</p>
        </div>
        <Button as={Link} href="/meus-desafios">
          Meus desafios
        </Button>
      </section>
    </main>
  );
}
