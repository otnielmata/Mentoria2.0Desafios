import Link from "next/link";
import Button from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="page-grid">
      <section className="hero-panel">
        <p className="eyebrow">Desafios Mentoria 2.0</p>
        <h1>Painel inicial para alunos e administradores acompanharem desafios.</h1>
        <p className="hero-copy">
          Estrutura web pronta para evoluir pelas user stories de desafios,
          pilares, pontuacao, aprovacoes e ranking consumindo a API REST.
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
          <span className="metric">RANK</span>
          <h2>Pontuacao</h2>
          <p>Desafios aprovados geram pontos para ranking individual e por grupo.</p>
        </article>
      </section>
    </main>
  );
}
