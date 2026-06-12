import Link from "next/link";
import Button from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="page-grid">
      <section className="hero-panel">
        <p className="eyebrow">Desafios Mentoria 2.0</p>
        <h1>Painel inicial para alunos e administradores acompanharem desafios.</h1>
        <p className="hero-copy">
          Estrutura web pronta para evoluir pelas user stories: login, registro,
          dashboard e heuristicas consumindo a API REST.
        </p>
        <div className="action-row">
          <Button as={Link} href="/login">
            Entrar
          </Button>
          <Button as={Link} href="/registro" variant="secondary">
            Criar conta
          </Button>
        </div>
      </section>

      <section className="summary-grid" aria-label="Modulos iniciais">
        <article className="info-card">
          <span className="metric">JWT</span>
          <h2>Autenticacao</h2>
          <p>Login e registro integrados aos endpoints de autenticacao da API.</p>
        </article>
        <article className="info-card">
          <span className="metric">MVC</span>
          <h2>Camadas</h2>
          <p>Views, controllers, models e services organizados para crescimento controlado.</p>
        </article>
        <article className="info-card">
          <span className="metric">API</span>
          <h2>Integracao</h2>
          <p>Cliente HTTP centralizado para consumir a API REST com token de sessao.</p>
        </article>
      </section>
    </main>
  );
}
