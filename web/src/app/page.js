"use client";

import { useEffect, useMemo, useState } from "react";

import apiClientModule from "../lib/api-client";
import configurationControllerModule from "../controllers/configuration.controller";
import configurationViewModule from "../views/configuration.view";

const { ENDPOINT_UNAVAILABLE_CODE, createApiClient } = apiClientModule;
const { loadConfigurationView } = configurationControllerModule;
const { createConfigurationReadOnlyView } = configurationViewModule;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const TEST_USERS = {
  admin: {
    email: "admin.manual@mentoria.local",
    password: "Teste@123",
  },
  aluno: {
    email: "aluno.manual@mentoria.local",
    password: "Teste@123",
  },
};

const MENU_BY_ROLE = {
  aluno: [
    { key: "inicio", label: "Início", supported: true },
    { key: "registrar", label: "Registrar Desafio", supported: false },
    { key: "meus-desafios", label: "Meus Desafios", supported: false },
    { key: "pontuacao", label: "Minha Pontuação", supported: false },
    { key: "ranking", label: "Ranking", supported: false },
    { key: "perfil", label: "Meu Perfil", supported: true },
  ],
  admin: [
    { key: "configuracoes", label: "Configurações", supported: true },
    { key: "dashboard", label: "Dashboard", supported: false },
    { key: "alunos", label: "Alunos", supported: false },
    { key: "turmas", label: "Turmas", supported: false },
    { key: "pilares", label: "Pilares", supported: false },
    { key: "desafios", label: "Desafios", supported: false },
    { key: "aprovacoes", label: "Aprovações", supported: false },
    { key: "ranking", label: "Ranking", supported: false },
    { key: "relatorios", label: "Relatórios", supported: false },
  ],
};

function getRole(user) {
  return user && (user.role === "admin" || user.role === "professor") ? "admin" : "aluno";
}

function getInitialView(user) {
  return getRole(user) === "admin" ? "configuracoes" : "inicio";
}

function getErrorMessage(error) {
  if (!error) return "";
  if (error.code === ENDPOINT_UNAVAILABLE_CODE) return "Funcionalidade indisponível no momento.";
  return error.message || "Não foi possível concluir a solicitação.";
}

function LoginScreen({ theme, onThemeChange, onLogin }) {
  const [email, setEmail] = useState(TEST_USERS.admin.email);
  const [password, setPassword] = useState(TEST_USERS.admin.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin({ email, password });
    } catch (loginError) {
      setError(getErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  function fillUser(type) {
    setEmail(TEST_USERS[type].email);
    setPassword(TEST_USERS[type].password);
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand">
          <span className="brand-mark">DM</span>
          <div>
            <h1>Desafios Mentoria 2.0</h1>
            <p className="muted">Painel Alavanque</p>
          </div>
        </div>

        <form className="login-form" onSubmit={submit}>
          <label className="field">
            <span>E-mail</span>
            <input value={email} autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              value={password}
              type="password"
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <div className="alert">{error}</div> : null}
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="actions">
          <button className="button secondary" type="button" onClick={() => fillUser("admin")}>
            Admin teste
          </button>
          <button className="button secondary" type="button" onClick={() => fillUser("aluno")}>
            Aluno teste
          </button>
          <button className="button ghost" type="button" onClick={onThemeChange}>
            Tema {theme === "dark" ? "claro" : "escuro"}
          </button>
        </div>
      </section>
      <section className="login-hero" aria-label="Mentoria">
        <div className="hero-copy">
          <h2>Método do Alavanque</h2>
          <p>Desafios, pontuação, rankings e evolução acompanhados com regras claras.</p>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ activeView, menu, onNavigate, onLogout, user }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark">DM</span>
        <div>
          <h3>{user.name}</h3>
          <p className="muted">{user.role}</p>
        </div>
      </div>

      <nav className="nav" aria-label="Menu principal">
        {menu.map((item) => (
          <button
            key={item.key}
            className={`${activeView === item.key ? "active" : ""} ${item.supported ? "" : "future"}`}
            type="button"
            onClick={() => onNavigate(item)}
          >
            <span>{item.label}</span>
            {!item.supported ? <span className="badge off">MVP</span> : null}
          </button>
        ))}
      </nav>

      <button className="button secondary" type="button" onClick={onLogout}>
        Sair
      </button>
    </aside>
  );
}

function ConfigurationView({ apiClient }) {
  const [state, setState] = useState({ loading: true, error: "", view: null });

  useEffect(() => {
    let active = true;

    async function load() {
      setState({ loading: true, error: "", view: null });
      try {
        const viewModel = await loadConfigurationView(apiClient);
        if (!active) return;
        setState({ loading: false, error: "", view: createConfigurationReadOnlyView(viewModel) });
      } catch (error) {
        if (!active) return;
        setState({ loading: false, error: getErrorMessage(error), view: null });
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [apiClient]);

  if (state.loading) {
    return <div className="alert neutral">Carregando configurações...</div>;
  }

  if (state.error) {
    return <div className="alert">{state.error}</div>;
  }

  const view = state.view;

  return (
    <div className="content">
      <section className="metrics">
        {view.highlights.map((item) => (
          <div className="metric" key={item.label}>
            <span className="muted">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{view.title}</h2>
            <p className="muted">{view.mode === "readonly" ? "Somente leitura" : "Editável"}</p>
          </div>
        </div>

        <div className="status-grid">
          {view.parameters.map((parameter) => (
            <div className="status-item" key={parameter.id}>
              <span className={`badge ${parameter.status === "ativo" ? "ok" : parameter.status === "futuro" ? "warn" : "off"}`}>
                {parameter.status}
              </span>
              <strong>{parameter.title}</strong>
              <span className="muted">{parameter.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileView({ user }) {
  return (
    <section className="panel">
      <h2>Meu Perfil</h2>
      <table className="table">
        <tbody>
          <tr>
            <th>Nome</th>
            <td>{user.name}</td>
          </tr>
          <tr>
            <th>E-mail</th>
            <td>{user.email}</td>
          </tr>
          <tr>
            <th>Perfil</th>
            <td>{user.role}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>{user.status}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function HomeView({ user }) {
  return (
    <div className="content">
      <section className="metrics">
        <div className="metric">
          <span className="muted">Perfil</span>
          <strong>{user.role}</strong>
        </div>
        <div className="metric">
          <span className="muted">Sessão</span>
          <strong>Ativa</strong>
        </div>
        <div className="metric">
          <span className="muted">API</span>
          <strong>Conectada</strong>
        </div>
      </section>
      <section className="panel">
        <h2>Início</h2>
        <p className="muted">Olá, {user.name}.</p>
      </section>
    </div>
  );
}

function FutureView({ selectedMenu }) {
  return (
    <section className="panel">
      <h2>{selectedMenu.label}</h2>
      <div className="alert neutral">Funcionalidade indisponível no MVP.</div>
    </section>
  );
}

function Workspace({ apiClient, onLogout, onThemeChange, theme, user }) {
  const [activeView, setActiveView] = useState(getInitialView(user));
  const [selectedMenu, setSelectedMenu] = useState(null);
  const menu = MENU_BY_ROLE[getRole(user)];

  function navigate(item) {
    setSelectedMenu(item);
    setActiveView(item.key);
  }

  return (
    <main className="workspace">
      <Sidebar activeView={activeView} menu={menu} onNavigate={navigate} onLogout={onLogout} user={user} />
      <section className="main">
        <header className="topbar">
          <div>
            <h1>{getRole(user) === "admin" ? "Área do professor/admin" : "Área do aluno"}</h1>
            <p className="muted">API REST em {API_BASE_URL}</p>
          </div>
          <div className="actions">
            <button className="button secondary" type="button" onClick={onThemeChange}>
              Tema {theme === "dark" ? "claro" : "escuro"}
            </button>
          </div>
        </header>

        {activeView === "configuracoes" ? <ConfigurationView apiClient={apiClient} /> : null}
        {activeView === "perfil" ? <ProfileView user={user} /> : null}
        {activeView === "inicio" ? <HomeView user={user} /> : null}
        {activeView !== "configuracoes" && activeView !== "perfil" && activeView !== "inicio" ? (
          <FutureView selectedMenu={selectedMenu || { label: activeView }} />
        ) : null}
      </section>
    </main>
  );
}

export default function Page() {
  const [theme, setTheme] = useState("light");
  const [session, setSession] = useState(null);

  useEffect(() => {
    const storedSession = window.localStorage.getItem("desafios.session");
    const storedTheme = window.localStorage.getItem("desafios.theme");
    if (storedTheme) setTheme(storedTheme);
    if (storedSession) {
      try {
        setSession(JSON.parse(storedSession));
      } catch {
        window.localStorage.removeItem("desafios.session");
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("desafios.theme", theme);
  }, [theme]);

  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: API_BASE_URL,
        getToken: () => session && session.token,
        onUnauthorized: () => {
          window.localStorage.removeItem("desafios.session");
          setSession(null);
        },
      }),
    [session]
  );

  async function login(credentials) {
    const result = await apiClient.request({ method: "POST", path: "/auth/login" }, { body: credentials });
    const nextSession = { token: result.token, user: result.user };
    window.localStorage.setItem("desafios.session", JSON.stringify(nextSession));
    setSession(nextSession);
  }

  function logout() {
    window.localStorage.removeItem("desafios.session");
    setSession(null);
  }

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  return (
    <div className="app" data-theme={theme}>
      {session ? (
        <Workspace apiClient={apiClient} onLogout={logout} onThemeChange={toggleTheme} theme={theme} user={session.user} />
      ) : (
        <LoginScreen theme={theme} onThemeChange={toggleTheme} onLogin={login} />
      )}
    </div>
  );
}
