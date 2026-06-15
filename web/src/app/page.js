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
    { key: "registrar", label: "Registrar Desafio", supported: true },
    { key: "meus-desafios", label: "Meus Desafios", supported: true },
    { key: "meus-grupos", label: "Meus Grupos", supported: true },
    { key: "pontuacao", label: "Minha Pontuação", supported: false },
    { key: "ranking", label: "Ranking", supported: false },
    { key: "perfil", label: "Meu Perfil", supported: true },
  ],
  admin: [
    { key: "configuracoes", label: "Configurações", supported: true },
    { key: "dashboard", label: "Dashboard", supported: false },
    { key: "alunos", label: "Alunos", supported: true },
    { key: "turmas", label: "Turmas", supported: true },
    { key: "pilares", label: "Pilares", supported: false },
    { key: "desafios", label: "Desafios", supported: true },
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

function getArray(value, field) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (field && Array.isArray(value[field])) return value[field];
  return [];
}

function joinIds(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function todaySuffix() {
  return new Date().toISOString().slice(0, 10);
}

function Notice({ message, type = "neutral" }) {
  if (!message) return null;
  return <div className={`alert ${type === "error" ? "" : "neutral"}`}>{message}</div>;
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

function AdminStudentsView({ apiClient }) {
  const [students, setStudents] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [editing, setEditing] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const [studentsResult, turmasResult] = await Promise.all([
        apiClient.request({ method: "GET", path: "/alunos?limit=100" }),
        apiClient.request({ method: "GET", path: "/turmas?limit=100" }),
      ]);
      setStudents(getArray(studentsResult, "alunos"));
      setTurmas(getArray(turmasResult, "turmas"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  async function createStudent(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setFeedback("");
    try {
      await apiClient.request(
        { method: "POST", path: "/alunos" },
        {
          body: {
            name: data.get("name"),
            email: data.get("email"),
            password: data.get("password"),
            turmaId: data.get("turmaId") || undefined,
            status: "ativo",
          },
        }
      );
      event.currentTarget.reset();
      setFeedback("Aluno cadastrado com sucesso.");
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    }
  }

  async function updateStudent(event) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    setError("");
    setFeedback("");
    try {
      await apiClient.request(
        { method: "PATCH", path: `/alunos/${editing.id}` },
        {
          body: {
            name: data.get("editName"),
            email: data.get("editEmail"),
            status: data.get("editStatus"),
          },
        }
      );
      setFeedback("Aluno atualizado com sucesso.");
      setEditing(null);
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Alunos</h2>
            <p className="muted">Cadastre, edite e copie IDs para formar grupos em desafios.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={createStudent}>
          <label className="field">
            <span>Nome</span>
            <input name="name" required placeholder={`Aluno ${todaySuffix()}`} />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input name="email" required type="email" placeholder="aluno@exemplo.com" />
          </label>
          <label className="field">
            <span>Senha inicial</span>
            <input name="password" required type="password" defaultValue="Teste@123" />
          </label>
          <label className="field">
            <span>Turma</span>
            <select name="turmaId" defaultValue="">
              <option value="">Sem turma</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            Cadastrar aluno
          </button>
        </form>
      </section>

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Editar aluno</h2>
            <button className="button ghost" type="button" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
          <form className="form-grid" onSubmit={updateStudent}>
            <label className="field">
              <span>Nome</span>
              <input name="editName" required defaultValue={editing.name} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input name="editEmail" required type="email" defaultValue={editing.email} />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="editStatus" defaultValue={editing.status || "ativo"}>
                <option value="ativo">ativo</option>
                <option value="inativo">inativo</option>
              </select>
            </label>
            <button className="button" type="submit">
              Salvar edição
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <h2>Lista de alunos</h2>
        {loading ? <Notice message="Carregando alunos..." /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>ID</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{student.status}</td>
                <td>
                  <code>{student.id}</code>
                </td>
                <td>
                  <button className="button secondary" type="button" onClick={() => setEditing(student)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function AdminTurmasView({ apiClient }) {
  const [turmas, setTurmas] = useState([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [turmaDetails, setTurmaDetails] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function loadTurmas() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/turmas?limit=100" });
      const nextTurmas = getArray(result, "turmas");
      setTurmas(nextTurmas);
      if (!selectedTurmaId && nextTurmas[0]) setSelectedTurmaId(nextTurmas[0].id);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  async function loadTurmaDetails(turmaId = selectedTurmaId) {
    if (!turmaId) return;
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: `/turmas/${turmaId}` });
      setTurmaDetails(result);
    } catch (detailsError) {
      setError(getErrorMessage(detailsError));
    }
  }

  useEffect(() => {
    loadTurmas();
  }, [apiClient]);

  useEffect(() => {
    if (selectedTurmaId) loadTurmaDetails(selectedTurmaId);
  }, [selectedTurmaId]);

  async function createTurma(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      const turma = await apiClient.request(
        { method: "POST", path: "/turmas" },
        {
          body: {
            name: data.get("name"),
            code: data.get("code"),
            description: data.get("description"),
            startDate: data.get("startDate") || undefined,
            status: "ativa",
          },
        }
      );
      event.currentTarget.reset();
      setFeedback("Turma cadastrada com sucesso.");
      setSelectedTurmaId(turma.id);
      await loadTurmas();
    } catch (createError) {
      setError(getErrorMessage(createError));
    }
  }

  async function enrollStudent(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "POST", path: `/turmas/${selectedTurmaId}/alunos` },
        {
          body: {
            alunoId: data.get("alunoId"),
          },
        }
      );
      event.currentTarget.reset();
      setFeedback("Aluno matriculado na turma.");
      await loadTurmaDetails(selectedTurmaId);
    } catch (enrollError) {
      setError(getErrorMessage(enrollError));
    }
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Turmas</h2>
            <p className="muted">Cadastre turmas, matricule alunos por ID e visualize alunos por turma.</p>
          </div>
          <button className="button secondary" type="button" onClick={loadTurmas}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={createTurma}>
          <label className="field">
            <span>Nome da turma</span>
            <input name="name" required placeholder={`Turma ${todaySuffix()}`} />
          </label>
          <label className="field">
            <span>Código</span>
            <input name="code" placeholder="M2-2026" />
          </label>
          <label className="field">
            <span>Início</span>
            <input name="startDate" type="date" />
          </label>
          <label className="field">
            <span>Descrição</span>
            <input name="description" placeholder="Mentoria 2.0" />
          </label>
          <button className="button" type="submit">
            Cadastrar turma
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Alunos por turma</h2>
            <p className="muted">Selecione uma turma para visualizar alunos matriculados.</p>
          </div>
        </div>
        <div className="toolbar">
          <label className="field">
            <span>Turma</span>
            <select value={selectedTurmaId} onChange={(event) => setSelectedTurmaId(event.target.value)}>
              <option value="">Selecione</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.name}
                </option>
              ))}
            </select>
          </label>
          <form className="inline-form" onSubmit={enrollStudent}>
            <label className="field">
              <span>ID do aluno</span>
              <input name="alunoId" placeholder="Cole o ID do aluno" />
            </label>
            <button className="button secondary" type="submit" disabled={!selectedTurmaId}>
              Matricular
            </button>
          </form>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>E-mail</th>
              <th>Status</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {getArray(turmaDetails, "alunos").map((aluno) => (
              <tr key={aluno.id}>
                <td>{aluno.name}</td>
                <td>{aluno.email}</td>
                <td>{aluno.status}</td>
                <td>
                  <code>{aluno.id}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function AdminDesafiosView({ apiClient }) {
  const [pilares, setPilares] = useState([]);
  const [desafios, setDesafios] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [pilaresResult, desafiosResult] = await Promise.all([
        apiClient.request({ method: "GET", path: "/pilares" }),
        apiClient.request({ method: "GET", path: "/desafios?limit=100&status=inativo" }),
      ]);
      const activeResult = await apiClient.request({ method: "GET", path: "/desafios?limit=100&status=ativo" });
      setPilares(getArray(pilaresResult, "pilares"));
      setDesafios([...getArray(desafiosResult, "desafios"), ...getArray(activeResult, "desafios")]);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  async function createDesafio(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "POST", path: "/desafios" },
        {
          body: {
            pilarId: data.get("pilarId"),
            title: data.get("title"),
            description: data.get("description"),
            points: Number(data.get("points")),
            type: data.get("type"),
            maxParticipantes: Number(data.get("maxParticipantes")),
            status: data.get("status"),
          },
        }
      );
      event.currentTarget.reset();
      setFeedback("Desafio cadastrado com sucesso.");
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    }
  }

  async function activateDesafio(desafioId) {
    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "PATCH", path: `/desafios/${desafioId}` }, { body: { status: "ativo" } });
      setFeedback("Desafio ativado.");
      await load();
    } catch (activateError) {
      setError(getErrorMessage(activateError));
    }
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Desafios</h2>
            <p className="muted">Cadastre desafios e ative quando estiverem prontos para alunos.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={createDesafio}>
          <label className="field">
            <span>Pilar</span>
            <select name="pilarId" required defaultValue="">
              <option value="">Selecione</option>
              {pilares.map((pilar) => (
                <option key={pilar.id} value={pilar.id}>
                  {pilar.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Título</span>
            <input name="title" required placeholder={`Desafio ${todaySuffix()}`} />
          </label>
          <label className="field">
            <span>Pontos</span>
            <input name="points" required type="number" min="1" defaultValue="10" />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select name="type" defaultValue="ambos">
              <option value="individual">individual</option>
              <option value="grupo">grupo</option>
              <option value="ambos">ambos</option>
            </select>
          </label>
          <label className="field">
            <span>Máx. participantes</span>
            <input name="maxParticipantes" required type="number" min="1" max="5" defaultValue="5" />
          </label>
          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue="inativo">
              <option value="inativo">inativo</option>
              <option value="ativo">ativo</option>
            </select>
          </label>
          <label className="field span-2">
            <span>Descrição</span>
            <textarea name="description" required placeholder="Descreva o que o aluno deve executar." />
          </label>
          <button className="button" type="submit">
            Cadastrar desafio
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Desafios cadastrados</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Pilar</th>
              <th>Pontos</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>ID</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {desafios.map((desafio) => (
              <tr key={desafio.id}>
                <td>{desafio.title}</td>
                <td>{desafio.pilar && desafio.pilar.name}</td>
                <td>{desafio.points}</td>
                <td>{desafio.type}</td>
                <td>{desafio.status}</td>
                <td>
                  <code>{desafio.id}</code>
                </td>
                <td>
                  <button className="button secondary" type="button" disabled={desafio.status === "ativo"} onClick={() => activateDesafio(desafio.id)}>
                    Ativar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StudentSubmitView({ apiClient }) {
  const [profile, setProfile] = useState(null);
  const [desafios, setDesafios] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [profileResult, desafiosResult, enviosResult] = await Promise.all([
        apiClient.request({ method: "GET", path: "/me" }),
        apiClient.request({ method: "GET", path: "/desafios?limit=100" }),
        apiClient.request({ method: "GET", path: "/envios-desafios/meus?limit=100" }),
      ]);
      setProfile(profileResult);
      setDesafios(getArray(desafiosResult, "desafios"));
      setEnvios(getArray(enviosResult, "envios"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  async function submitEnvio(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const type = data.get("type");
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "POST", path: "/envios-desafios" },
        {
          body: {
            desafioId: data.get("desafioId"),
            turmaId: data.get("turmaId"),
            type,
            description: data.get("description"),
            evidencias: [data.get("evidencia")],
            participantes: type === "grupo" ? joinIds(data.get("participantes")) : [],
          },
        }
      );
      event.currentTarget.reset();
      setFeedback("Envio registrado e enviado para aprovação.");
      await load();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Registrar Desafio</h2>
            <p className="muted">Escolha um desafio ativo, informe evidência e envie para aprovação.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={submitEnvio}>
          <label className="field">
            <span>Desafio</span>
            <select name="desafioId" required defaultValue="">
              <option value="">Selecione</option>
              {desafios.map((desafio) => (
                <option key={desafio.id} value={desafio.id}>
                  {desafio.title} ({desafio.points} pts)
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Turma</span>
            <input name="turmaId" required defaultValue={profile && profile.turmas && profile.turmas[0] ? profile.turmas[0] : ""} placeholder="ID da turma" />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select name="type" defaultValue="individual">
              <option value="individual">individual</option>
              <option value="grupo">grupo</option>
            </select>
          </label>
          <label className="field">
            <span>Participantes do grupo</span>
            <input name="participantes" placeholder="IDs separados por vírgula" />
          </label>
          <label className="field span-2">
            <span>Descrição</span>
            <textarea name="description" required placeholder="Descreva o que foi feito." />
          </label>
          <label className="field span-2">
            <span>Evidência/link/comprovante</span>
            <input name="evidencia" required placeholder="https://..." />
          </label>
          <button className="button" type="submit">
            Enviar para aprovação
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Meus envios</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Desafio</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Participantes</th>
            </tr>
          </thead>
          <tbody>
            {envios.map((envio) => (
              <tr key={envio.id}>
                <td>{envio.desafio ? envio.desafio.title : envio.desafioId}</td>
                <td>{envio.type}</td>
                <td>{envio.status}</td>
                <td>{getArray(envio, "participantes").length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StudentGroupsView({ apiClient }) {
  const [grupos, setGrupos] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/grupos/meus" });
      setGrupos(getArray(result, "grupos"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Meus Grupos</h2>
            <p className="muted">Veja os grupos vinculados aos seus envios de desafio.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={error} type="error" />
        <table className="table">
          <thead>
            <tr>
              <th>Desafio</th>
              <th>Turma</th>
              <th>Status</th>
              <th>Participantes</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => (
              <tr key={grupo.id}>
                <td>{grupo.desafio ? grupo.desafio.title : grupo.id}</td>
                <td>{grupo.turma ? grupo.turma.name : "-"}</td>
                <td>{grupo.status}</td>
                <td>{getArray(grupo, "participantes").map((participante) => participante.name || participante.id).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {grupos.length === 0 ? <Notice message="Nenhum grupo encontrado para este aluno." /> : null}
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
        {activeView === "alunos" ? <AdminStudentsView apiClient={apiClient} /> : null}
        {activeView === "turmas" ? <AdminTurmasView apiClient={apiClient} /> : null}
        {activeView === "desafios" ? <AdminDesafiosView apiClient={apiClient} /> : null}
        {activeView === "registrar" ? <StudentSubmitView apiClient={apiClient} /> : null}
        {activeView === "meus-desafios" ? <StudentSubmitView apiClient={apiClient} /> : null}
        {activeView === "meus-grupos" ? <StudentGroupsView apiClient={apiClient} /> : null}
        {activeView === "perfil" ? <ProfileView user={user} /> : null}
        {activeView === "inicio" ? <HomeView user={user} /> : null}
        {!["configuracoes", "alunos", "turmas", "desafios", "registrar", "meus-desafios", "meus-grupos", "perfil", "inicio"].includes(activeView) ? (
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
