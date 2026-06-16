"use client";

import { useEffect, useMemo, useState } from "react";

import apiClientModule from "../lib/api-client";

const { ENDPOINT_UNAVAILABLE_CODE, createApiClient } = apiClientModule;

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
    { key: "calendario", label: "Calendário", supported: false },
    { key: "desafios", label: "Desafios", supported: true },
    { key: "meus-grupos", label: "Meus Grupos", supported: true },
    { key: "pontuacao", label: "Minha Pontuação", supported: true },
    { key: "perfil", label: "Meu Perfil", supported: true },
  ],
  admin: [
    { key: "dashboard", label: "Dashboard", supported: true },
    { key: "alunos", label: "Alunos", supported: true },
    { key: "turmas", label: "Turmas", supported: true },
    { key: "pilares", label: "Pilares", supported: true },
    { key: "desafios", label: "Desafios", supported: true },
    { key: "aprovacoes", label: "Aprovações", supported: true },
    { key: "ranking", label: "Ranking", supported: true },
    { key: "relatorios", label: "Relatórios", supported: false },
    { key: "configuracoes", label: "Configurações", supported: true, roles: ["admin"] },
  ],
};

function getRole(user) {
  return user && (user.role === "admin" || user.role === "professor") ? "admin" : "aluno";
}

function getInitialView(user) {
  return getRole(user) === "admin" ? "dashboard" : "inicio";
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

function getProfileUser(value) {
  return value && value.user ? value.user : value;
}

function getEntityId(entity) {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity.id || entity._id || "";
}

function formatTurmaName(turma) {
  if (!turma) return "-";
  if (typeof turma === "string") return turma;
  return turma.name || turma.code || turma.id || "-";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function formatDate(value) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function formatDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function formatRankingPosition(value) {
  return value ? `${value}º lugar` : "Sem posição";
}

function formatEvidenceItem(item) {
  if (!item) return "-";
  if (typeof item === "string") return item;
  return item.url || item.link || item.name || item.nome || item.text || item.texto || JSON.stringify(item);
}

function formatAttachmentItem(item) {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item !== "object") return String(item).trim();

  return String(item.url || item.link || item.name || item.nome || item.filename || item.fileName || "").trim();
}

function formatAttachmentList(items) {
  const formattedItems = getArray(items).map(formatAttachmentItem).filter(Boolean);
  return formattedItems.length > 0 ? formattedItems.join(", ") : "Sem anexo";
}

function todaySuffix() {
  return new Date().toISOString().slice(0, 10);
}

function readFileAsAttachment(file) {
  if (!file) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        content: reader.result,
      });
    reader.onerror = () => reject(reader.error || new Error("Não foi possível ler o anexo."));
    reader.readAsDataURL(file);
  });
}

function Notice({ message, type = "neutral" }) {
  if (!message) return null;
  return <div className={`alert ${type === "error" ? "" : "neutral"}`}>{message}</div>;
}

function LoginScreen({ theme, onThemeChange, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState(TEST_USERS.admin.email);
  const [password, setPassword] = useState(TEST_USERS.admin.password);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLogin(event) {
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

  async function submitRegister(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onRegister({ name, email, password });
    } catch (registerError) {
      setError(getErrorMessage(registerError));
    } finally {
      setLoading(false);
    }
  }

  function fillUser(type) {
    setMode("login");
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

        {mode === "login" ? (
          <form className="login-form" onSubmit={submitLogin}>
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
            <button
              className="button ghost"
              type="button"
              onClick={() => {
                setMode("register");
                setName("");
                setEmail("");
                setPassword("");
                setError("");
              }}
            >
              Inscrever-se como aluno
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={submitRegister}>
            <label className="field">
              <span>Nome completo</span>
              <input value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              <span>Senha</span>
              <input
                value={password}
                type="password"
                autoComplete="new-password"
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <div className="alert">{error}</div> : null}
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Inscrevendo..." : "Criar inscrição"}
            </button>
            <button className="button ghost" type="button" onClick={() => setMode("login")}>
              Voltar para login
            </button>
          </form>
        )}

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
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "", role: "", status: "" });
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function buildUsersPath(nextFilters = filters) {
    const params = new URLSearchParams({ limit: "100" });
    if (nextFilters.search) params.set("search", nextFilters.search);
    if (nextFilters.role) params.set("role", nextFilters.role);
    if (nextFilters.status) params.set("status", nextFilters.status);
    return `/users?${params.toString()}`;
  }

  async function load(nextFilters = filters) {
    setError("");
    setLoading(true);
    try {
      const result = await apiClient.request({ method: "GET", path: buildUsersPath(nextFilters) });
      setUsers(getArray(result, "users").length > 0 ? getArray(result, "users") : getArray(result, "usuarios"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    await load(filters);
  }

  async function createUser(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "POST", path: "/users" },
        {
          body: {
            name: data.get("name"),
            email: data.get("email"),
            password: data.get("password"),
            role: data.get("role"),
            status: data.get("status"),
          },
        }
      );
      event.currentTarget.reset();
      setFeedback("Usuário cadastrado com sucesso.");
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    }
  }

  async function updateUser(event) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "PATCH", path: `/users/${editing.id}` },
        {
          body: {
            name: data.get("editName"),
            email: data.get("editEmail"),
            password: data.get("editPassword") || undefined,
            role: data.get("editRole"),
            status: data.get("editStatus"),
          },
        }
      );
      setEditing(null);
      setFeedback("Usuário atualizado com sucesso.");
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
            <h2>Configurações</h2>
            <p className="muted">Gestão de usuários e perfis do sistema.</p>
          </div>
          <button className="button secondary" type="button" onClick={() => load()}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />

        <form className="form-grid" onSubmit={createUser}>
          <label className="field">
            <span>Nome</span>
            <input name="name" required placeholder="Nome completo" />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input name="email" required type="email" placeholder="usuario@exemplo.com" />
          </label>
          <label className="field">
            <span>Senha inicial</span>
            <input name="password" required type="password" defaultValue="Teste@123" />
          </label>
          <label className="field">
            <span>Perfil</span>
            <select name="role" defaultValue="aluno">
              <option value="aluno">Aluno</option>
              <option value="professor">Professor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue="ativo">
              <option value="ativo">ativo</option>
              <option value="inativo">inativo</option>
            </select>
          </label>
          <button className="button" type="submit">
            Cadastrar usuário
          </button>
        </form>
      </section>

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Editar usuário</h2>
              <p className="muted">Atualize dados, senha, status e perfil de acesso.</p>
            </div>
            <button className="button ghost" type="button" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
          <form className="form-grid" key={editing.id} onSubmit={updateUser}>
            <label className="field">
              <span>Nome</span>
              <input name="editName" required defaultValue={editing.name} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input name="editEmail" required type="email" defaultValue={editing.email} />
            </label>
            <label className="field">
              <span>Nova senha</span>
              <input name="editPassword" type="password" placeholder="Preencha apenas se for alterar" />
            </label>
            <label className="field">
              <span>Perfil</span>
              <select name="editRole" defaultValue={editing.role || "aluno"}>
                <option value="aluno">Aluno</option>
                <option value="professor">Professor</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <label className="field">
              <span>Status</span>
              <select name="editStatus" defaultValue={editing.status || "ativo"}>
                <option value="ativo">ativo</option>
                <option value="inativo">inativo</option>
              </select>
            </label>
            <button className="button" type="submit">
              Salvar usuário
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Usuários</h2>
            <p className="muted">Filtre por nome, e-mail, status ou perfil.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={applyFilters}>
          <label className="field">
            <span>Buscar</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Nome ou e-mail" />
          </label>
          <label className="field">
            <span>Perfil</span>
            <select value={filters.role} onChange={(event) => updateFilter("role", event.target.value)}>
              <option value="">Todos</option>
              <option value="aluno">Aluno</option>
              <option value="professor">Professor</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="">Todos</option>
              <option value="ativo">ativo</option>
              <option value="inativo">inativo</option>
            </select>
          </label>
          <button className="button secondary" type="submit">
            Filtrar
          </button>
        </form>

        {loading ? <Notice message="Carregando usuários..." /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>ID</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((managedUser) => (
              <tr key={managedUser.id}>
                <td>{managedUser.name}</td>
                <td>{managedUser.email}</td>
                <td>{managedUser.role}</td>
                <td>{managedUser.status}</td>
                <td>
                  <code>{managedUser.id}</code>
                </td>
                <td>
                  <button className="button secondary" type="button" onClick={() => setEditing(managedUser)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && users.length === 0 ? <Notice message="Nenhum usuário encontrado para o filtro informado." /> : null}
      </section>
    </div>
  );
}
function ProfileView({ apiClient, user, onUserChange }) {
  const [profile, setProfile] = useState(user);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/me" });
      setProfile(getProfileUser(result));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  async function updateProfile(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword") || "").trim();
    const currentPassword = String(data.get("currentPassword") || "").trim();
    const body = {
      name: data.get("name"),
    };

    if (newPassword || currentPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    setFeedback("");
    setError("");
    try {
      const result = await apiClient.request({ method: "PATCH", path: "/me" }, { body });
      const updatedUser = getProfileUser(result);
      setProfile(updatedUser);
      onUserChange(updatedUser);
      event.currentTarget.elements.currentPassword.value = "";
      event.currentTarget.elements.newPassword.value = "";
      setFeedback("Perfil atualizado com sucesso.");
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  const turmas = getArray(profile, "turmas");

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Meu Perfil</h2>
            <p className="muted">Altere seu nome completo e senha.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" key={`${profile.id || profile.email || "perfil"}-${profile.name || ""}`} onSubmit={updateProfile}>
          <label className="field">
            <span>Nome completo</span>
            <input name="name" required defaultValue={profile.name} />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input value={profile.email || ""} disabled readOnly />
          </label>
          <label className="field">
            <span>Senha atual</span>
            <input name="currentPassword" type="password" autoComplete="current-password" />
          </label>
          <label className="field">
            <span>Nova senha</span>
            <input name="newPassword" type="password" autoComplete="new-password" />
          </label>
          <button className="button" type="submit">
            Salvar perfil
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Dados administrativos</h2>
        <table className="table">
          <tbody>
            <tr>
              <th>Perfil</th>
              <td>{profile.role}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>{profile.status}</td>
            </tr>
            <tr>
              <th>Turma</th>
              <td>{turmas.length > 0 ? turmas.map(formatTurmaName).join(", ") : "Sem turma definida"}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

function buildPilarChartItems(dashboard) {
  const source = getArray(dashboard, "pontosPorPilar");
  const total = source.reduce((sum, item) => sum + Number(item.desafiosAprovados || item.pontos || 0), 0);

  return source.map((item, index) => {
    const value = Number(item.desafiosAprovados || item.pontos || 0);
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return {
      id: (item.pilar && item.pilar.id) || `pilar-${index}`,
      name: (item.pilar && item.pilar.name) || "Sem pilar",
      percentage,
      value,
      color: ["#0f766e", "#8b5cf6", "#f59e0b", "#2563eb", "#dc2626", "#16a34a", "#db2777"][index % 7],
    };
  });
}

function buildAdminPilarChartItems(dashboard) {
  const source = getArray(dashboard, "desafiosPorPilar").length > 0 ? getArray(dashboard, "desafiosPorPilar") : getArray(dashboard, "rankingPorPilar");
  const total = source.reduce((sum, item) => sum + Number(item.quantidade || item.desafiosAprovados || 0), 0);

  return source.map((item, index) => {
    const value = Number(item.quantidade || item.desafiosAprovados || 0);
    const percentage = item.percentual !== undefined ? Math.round(Number(item.percentual || 0) * 100) : total > 0 ? Math.round((value / total) * 100) : 0;
    return {
      id: (item.pilar && item.pilar.id) || `admin-pilar-${index}`,
      name: (item.pilar && item.pilar.name) || "Sem pilar",
      percentage,
      value,
      color: ["#0f766e", "#8b5cf6", "#f59e0b", "#2563eb", "#dc2626", "#16a34a", "#db2777"][index % 7],
    };
  });
}

function buildPieGradient(items) {
  let cursor = 0;
  const slices = items
    .filter((item) => item.percentage > 0)
    .map((item) => {
      const start = cursor;
      cursor += item.percentage;
      return `${item.color} ${start}% ${cursor}%`;
    });

  return slices.length > 0 ? `conic-gradient(${slices.join(", ")})` : "var(--surface-soft)";
}

function HomeView({ apiClient, user }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/dashboard/aluno" });
      setDashboard(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  const chartItems = buildPilarChartItems(dashboard);
  const rankingPosition = dashboard && (dashboard.posicaoRanking || (dashboard.ranking && dashboard.ranking.posicao));
  const totalDesafios = dashboard && dashboard.desafiosEnviados ? dashboard.desafiosEnviados.total : 0;

  return (
    <div className="content">
      <section className="student-hero panel">
        <div>
          <span className="muted">Nome do Aluno</span>
          <h2>{user.name}</h2>
        </div>
        <button className="button secondary" type="button" onClick={load}>
          Atualizar
        </button>
      </section>
      <Notice message={error} type="error" />
      <section className="metrics student-metrics">
        <div className="metric">
          <span className="muted">Posição do Ranking</span>
          <strong>{formatRankingPosition(rankingPosition)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Pontuação</span>
          <strong>{formatNumber(dashboard && dashboard.totalPontos)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Quantidade de Desafios</span>
          <strong>{formatNumber(totalDesafios)}</strong>
        </div>
      </section>
      <section className="panel chart-panel">
        <div>
          <h2>Desafios por pilar</h2>
          <p className="muted">Percentual de desafios aprovados por pilar do método.</p>
        </div>
        <div className="pie-layout">
          <div className="pie-chart" style={{ background: buildPieGradient(chartItems) }}>
            <span>{chartItems.length > 0 ? "100%" : "0%"}</span>
          </div>
          <div className="legend-list">
            {chartItems.length > 0 ? (
              chartItems.map((item) => (
                <div className="legend-item" key={item.id}>
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{item.percentage}%</strong>
                </div>
              ))
            ) : (
              <Notice message="Ainda não há desafios aprovados para montar o gráfico." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminDashboardView({ apiClient }) {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/dashboard/admin" });
      setDashboard(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  const indicadores = (dashboard && dashboard.indicadores) || {};
  const ranking = getArray(dashboard, "topRanking").length > 0 ? getArray(dashboard, "topRanking") : getArray(dashboard, "ranking");
  const chartItems = buildAdminPilarChartItems(dashboard);

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Dashboard</h2>
            <p className="muted">Visão da turma com ranking, desafios enviados e distribuição por pilar.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={error} type="error" />
      </section>

      <section className="metrics">
        <div className="metric">
          <span className="muted">Alunos ativos</span>
          <strong>{formatNumber(indicadores.alunosAtivos)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Quantidade de Desafios</span>
          <strong>{formatNumber(indicadores.quantidadeDesafios || indicadores.totalEnvios)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Pendentes de aprovação</span>
          <strong>{formatNumber(indicadores.aprovacoesPendentes)}</strong>
        </div>
      </section>

      <section className="panel">
        <h2>Ranking dos 10 primeiros alunos</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Aluno</th>
              <th>Pontuação</th>
              <th>Desafios</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row) => (
              <tr key={(row.aluno && row.aluno.id) || row.posicao}>
                <td>{row.posicao}º</td>
                <td>{row.aluno && row.aluno.name}</td>
                <td>{formatNumber(row.totalPontos)}</td>
                <td>{formatNumber(row.desafiosAprovados)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel chart-panel">
        <div>
          <h2>Desafios por pilar</h2>
          <p className="muted">Percentual de desafios aprovados por pilar do método.</p>
        </div>
        <div className="pie-layout">
          <div className="pie-chart" style={{ background: buildPieGradient(chartItems) }}>
            <span>{chartItems.length > 0 ? "100%" : "0%"}</span>
          </div>
          <div className="legend-list">
            {chartItems.length > 0 ? (
              chartItems.map((item) => (
                <div className="legend-item" key={item.id}>
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span>{item.name}</span>
                  <strong>{item.percentage}%</strong>
                </div>
              ))
            ) : (
              <Notice message="Ainda não há desafios aprovados para montar o gráfico." />
            )}
          </div>
        </div>
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
            password: data.get("editPassword") || undefined,
            turmaId: data.get("editTurmaId") || "",
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

  function getStudentTurmaNames(student) {
    const ids = student && Array.isArray(student.turmas) ? student.turmas : [];
    if (ids.length === 0) return "Sem turma";
    return ids
      .map((id) => {
        const turma = turmas.find((item) => item.id === id);
        return turma ? turma.name : id;
      })
      .join(", ");
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
            <label className="field">
              <span>Turma</span>
              <select name="editTurmaId" defaultValue={(editing.turmas && editing.turmas[0]) || ""}>
                <option value="">Sem turma</option>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Nova senha</span>
              <input name="editPassword" type="password" placeholder="Preencha apenas se for alterar" />
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
              <th>Turma</th>
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
                <td>{getStudentTurmaNames(student)}</td>
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

function AdminPilaresView({ apiClient }) {
  const [pilares, setPilares] = useState([]);
  const [editing, setEditing] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [activeResult, inactiveResult] = await Promise.all([
        apiClient.request({ method: "GET", path: "/pilares?status=ativo" }),
        apiClient.request({ method: "GET", path: "/pilares?status=inativo" }),
      ]);
      setPilares([...getArray(activeResult, "pilares"), ...getArray(inactiveResult, "pilares")]);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  async function createPilar(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "POST", path: "/pilares" },
        {
          body: {
            name: data.get("name"),
            description: data.get("description"),
          },
        }
      );
      event.currentTarget.reset();
      setFeedback("Pilar cadastrado com sucesso.");
      await load();
    } catch (createError) {
      setError(getErrorMessage(createError));
    }
  }

  async function updatePilar(event) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "PATCH", path: `/pilares/${editing.id}` },
        {
          body: {
            name: data.get("editName"),
            description: data.get("editDescription"),
            status: data.get("editStatus"),
          },
        }
      );
      setEditing(null);
      setFeedback("Pilar atualizado.");
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function togglePilar(pilar) {
    setFeedback("");
    setError("");
    try {
      if (pilar.status === "ativo") {
        await apiClient.request({ method: "DELETE", path: `/pilares/${pilar.id}` });
        setFeedback("Pilar excluído da lista ativa.");
      } else {
        await apiClient.request({ method: "PATCH", path: `/pilares/${pilar.id}` }, { body: { status: "ativo" } });
        setFeedback("Pilar ativado.");
      }
      await load();
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    }
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Pilares</h2>
            <p className="muted">Cadastre, edite e exclua pilares do método quando necessário.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={createPilar}>
          <label className="field">
            <span>Nome</span>
            <input name="name" required placeholder="Novo pilar" />
          </label>
          <label className="field">
            <span>Descrição</span>
            <input name="description" placeholder="Resumo do pilar" />
          </label>
          <button className="button" type="submit">
            Cadastrar pilar
          </button>
        </form>
      </section>

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Editar pilar</h2>
            <button className="button ghost" type="button" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
          <form className="form-grid" onSubmit={updatePilar}>
            <label className="field">
              <span>Nome</span>
              <input name="editName" required defaultValue={editing.name} />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="editStatus" defaultValue={editing.status || "ativo"}>
                <option value="ativo">ativo</option>
                <option value="inativo">inativo</option>
              </select>
            </label>
            <label className="field span-2">
              <span>Descrição</span>
              <textarea name="editDescription" defaultValue={editing.description || ""} />
            </label>
            <button className="button" type="submit">
              Salvar pilar
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <h2>Pilares cadastrados</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Status</th>
              <th>Origem</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {pilares.map((pilar) => (
              <tr key={pilar.id}>
                <td>{pilar.name}</td>
                <td>{pilar.description || "-"}</td>
                <td>{pilar.status}</td>
                <td>{pilar.isDefault ? "padrão" : "manual"}</td>
                <td>
                  <div className="actions table-actions">
                    <button className="button secondary" type="button" onClick={() => setEditing(pilar)}>
                      Editar
                    </button>
                    <button className="button ghost" type="button" onClick={() => togglePilar(pilar)}>
                      {pilar.status === "ativo" ? "Excluir" : "Ativar"}
                    </button>
                  </div>
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
  const [editing, setEditing] = useState(null);
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
    const maxParticipantes = Number(data.get("maxParticipantes"));
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
            deliveryDate: data.get("deliveryDate") || undefined,
            points: Number(data.get("points")),
            livePresentationPoints: Number(data.get("livePresentationPoints") || 0),
            type: maxParticipantes > 1 ? "grupo" : "individual",
            maxParticipantes,
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

  async function toggleDesafioStatus(desafio) {
    const nextStatus = desafio.status === "ativo" ? "inativo" : "ativo";
    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "PATCH", path: `/desafios/${desafio.id}` }, { body: { status: nextStatus } });
      setFeedback(nextStatus === "ativo" ? "Desafio ativado." : "Desafio desativado.");
      await load();
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    }
  }

  async function updateDesafio(event) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    const maxParticipantes = Number(data.get("editMaxParticipantes"));
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "PATCH", path: `/desafios/${editing.id}` },
        {
          body: {
            pilarId: data.get("editPilarId"),
            title: data.get("editTitle"),
            description: data.get("editDescription"),
            deliveryDate: data.get("editDeliveryDate") || null,
            points: Number(data.get("editPoints")),
            livePresentationPoints: Number(data.get("editLivePresentationPoints") || 0),
            type: maxParticipantes > 1 ? "grupo" : "individual",
            maxParticipantes,
            status: data.get("editStatus"),
          },
        }
      );
      setEditing(null);
      setFeedback("Desafio atualizado.");
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function deleteDesafio(desafio) {
    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "DELETE", path: `/desafios/${desafio.id}` });
      setFeedback("Desafio apagado.");
      if (editing && editing.id === desafio.id) setEditing(null);
      await load();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
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
            <span>Pontos apresentação ao vivo</span>
            <input name="livePresentationPoints" required type="number" min="0" defaultValue="0" />
          </label>
          <label className="field">
            <span>Data limite de entrega</span>
            <input name="deliveryDate" type="date" />
          </label>
          <label className="field">
            <span>Participantes por grupo</span>
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

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Editar desafio</h2>
              <p className="muted">Atualize dados, pontuação, pilar, entrega e status.</p>
            </div>
            <button className="button ghost" type="button" onClick={() => setEditing(null)}>
              Cancelar
            </button>
          </div>
          <form className="form-grid" key={editing.id} onSubmit={updateDesafio}>
            <label className="field">
              <span>Pilar</span>
              <select name="editPilarId" required defaultValue={getEntityId(editing.pilar)}>
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
              <input name="editTitle" required defaultValue={editing.title} />
            </label>
            <label className="field">
              <span>Pontos</span>
              <input name="editPoints" required type="number" min="1" defaultValue={editing.points || 10} />
            </label>
            <label className="field">
              <span>Pontos apresentação ao vivo</span>
              <input
                name="editLivePresentationPoints"
                required
                type="number"
                min="0"
                defaultValue={editing.livePresentationPoints || editing.pontosApresentacaoAoVivo || 0}
              />
            </label>
            <label className="field">
              <span>Data limite de entrega</span>
              <input name="editDeliveryDate" type="date" defaultValue={formatDateInputValue(editing.deliveryDate || editing.dataEntrega)} />
            </label>
            <label className="field">
              <span>Participantes por grupo</span>
              <input name="editMaxParticipantes" required type="number" min="1" max="5" defaultValue={editing.maxParticipantes || 1} />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="editStatus" defaultValue={editing.status || "inativo"}>
                <option value="inativo">inativo</option>
                <option value="ativo">ativo</option>
              </select>
            </label>
            <label className="field span-2">
              <span>Descrição</span>
              <textarea name="editDescription" required defaultValue={editing.description || ""} />
            </label>
            <button className="button" type="submit">
              Salvar edição
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <h2>Desafios cadastrados</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Pilar</th>
              <th>Pontos</th>
              <th>Apresentação</th>
              <th>Entrega até</th>
              <th>Participantes</th>
              <th>Status</th>
              <th>ID</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {desafios.map((desafio) => (
              <tr key={desafio.id}>
                <td>{desafio.title}</td>
                <td>{desafio.pilar && desafio.pilar.name}</td>
                <td>{desafio.points}</td>
                <td>{formatNumber(desafio.livePresentationPoints || desafio.pontosApresentacaoAoVivo)}</td>
                <td>{formatDate(desafio.deliveryDate || desafio.dataEntrega)}</td>
                <td>{desafio.maxParticipantes}</td>
                <td>{desafio.status}</td>
                <td>
                  <code>{desafio.id}</code>
                </td>
                <td>
                  <div className="actions table-actions">
                    <button className="button secondary" type="button" onClick={() => setEditing(desafio)}>
                      Editar
                    </button>
                    <button className="button ghost" type="button" onClick={() => deleteDesafio(desafio)}>
                      Apagar
                    </button>
                    <button className="button secondary" type="button" onClick={() => toggleDesafioStatus(desafio)}>
                      {desafio.status === "ativo" ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function AdminApprovalsView({ apiClient }) {
  const [envios, setEnvios] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/envios-desafios/aprovacoes?limit=100&sort=desc" });
      setEnvios(getArray(result, "envios"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  async function evaluateEnvio(event, envio) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const decision = event.nativeEvent.submitter ? event.nativeEvent.submitter.value : "aprovado";
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "PATCH", path: "/envios-desafios/aprovacoes" },
        {
          body: {
            envioId: envio.id,
            decision,
            feedback: data.get("feedback") || undefined,
            apresentacaoAoVivo: data.get("apresentacaoAoVivo") === "on",
          },
        }
      );
      setFeedback("Avaliação registrada.");
      await load();
    } catch (evaluationError) {
      setError(getErrorMessage(evaluationError));
    }
  }

  function getParticipantes(envio) {
    const participantes = getArray(envio, "participantes");
    if (participantes.length > 0) return participantes;
    return envio.aluno ? [envio.aluno] : [];
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Aprovações</h2>
            <p className="muted">Revise os envios pendentes, confira evidências e aprove ou reprove.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
      </section>

      {envios.length === 0 ? <Notice message="Nenhum envio pendente no momento." /> : null}
      {envios.map((envio) => (
        <section className="panel" key={envio.id}>
          <div className="panel-header">
            <div>
              <h2>{envio.desafio ? envio.desafio.title : "Envio de desafio"}</h2>
              <p className="muted">
                Responsável: {envio.aluno ? envio.aluno.name : envio.alunoId} · Turma: {formatTurmaName(envio.turma)}
              </p>
            </div>
            <span className="badge warn">{envio.status}</span>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <span className="muted">Descrição enviada</span>
              <strong>{envio.description}</strong>
            </div>
            <div className="status-item">
              <span className="muted">Pontuação</span>
              <strong>{formatNumber(envio.desafio && envio.desafio.points)} pontos do desafio</strong>
              <span className="muted">
                +{formatNumber(envio.desafio && envio.desafio.livePresentationPoints)} apresentação somente se marcar o checkbox ao aprovar
              </span>
            </div>
            <div className="status-item">
              <span className="muted">Participantes</span>
              <strong>{getParticipantes(envio).map((participante) => participante.name || participante.id).join(", ")}</strong>
            </div>
            <div className="status-item">
              <span className="muted">Evidências</span>
              <strong>{getArray(envio, "evidencias").map(formatEvidenceItem).join(", ") || "-"}</strong>
            </div>
            <div className="status-item span-2">
              <span className="muted">Anexos</span>
              <strong>{formatAttachmentList(envio && envio.anexos)}</strong>
            </div>
          </div>
          <form className="form-grid" onSubmit={(event) => evaluateEnvio(event, envio)}>
            <label className="field span-2">
              <span>Feedback</span>
              <textarea name="feedback" placeholder="Obrigatório para reprovar." />
            </label>
            <label className="checkbox-field span-2">
              <input name="apresentacaoAoVivo" type="checkbox" />
              <span>Este grupo apresentou o desafio em evento ao vivo</span>
            </label>
            <div className="actions span-2">
              <button className="button" type="submit" name="decision" value="aprovado">
                Aprovar
              </button>
              <button className="button secondary" type="submit" name="decision" value="reprovado">
                Reprovar
              </button>
            </div>
          </form>
        </section>
      ))}
    </div>
  );
}

function AdminRankingView({ apiClient }) {
  const [ranking, setRanking] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/ranking/admin?limit=100" });
      setRanking(getArray(result, "ranking"));
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
            <h2>Ranking</h2>
            <p className="muted">Listagem dos alunos rankeados por pontuação e desafios executados.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={error} type="error" />
        <table className="table">
          <thead>
            <tr>
              <th>Posição</th>
              <th>Aluno</th>
              <th>Pontuação</th>
              <th>Desafios executados</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row) => (
              <tr key={(row.aluno && row.aluno.id) || row.posicao}>
                <td>{row.posicao}º</td>
                <td>{row.aluno && row.aluno.name}</td>
                <td>{formatNumber(row.totalPontos)}</td>
                <td>{formatNumber(row.desafiosAprovados)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StudentChallengesView({ apiClient }) {
  const [desafios, setDesafios] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [selectedInscricaoId, setSelectedInscricaoId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const [desafiosResult, inscricoesResult, enviosResult] = await Promise.all([
        apiClient.request({ method: "GET", path: "/desafios?limit=100" }),
        apiClient.request({ method: "GET", path: "/desafios/inscricoes/minhas" }),
        apiClient.request({ method: "GET", path: "/envios-desafios/meus?limit=100" }),
      ]);
      const nextInscricoes = getArray(inscricoesResult, "inscricoes");
      setDesafios(getArray(desafiosResult, "desafios"));
      setInscricoes(nextInscricoes);
      setEnvios(getArray(enviosResult, "envios"));
      if (!selectedInscricaoId && nextInscricoes[0]) setSelectedInscricaoId(nextInscricoes[0].id);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  async function subscribe(desafioId) {
    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "POST", path: `/desafios/${desafioId}/inscricoes` });
      setFeedback("Inscrição realizada. O grupo foi formado automaticamente.");
      await load();
    } catch (subscribeError) {
      setError(getErrorMessage(subscribeError));
    }
  }

  async function submitEnvio(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const selectedInscricao = inscricoes.find((inscricao) => inscricao.id === selectedInscricaoId);
    const anexo = await readFileAsAttachment(data.get("anexo"));
    setFeedback("");
    setError("");

    if (!selectedInscricao || !selectedInscricao.grupo) {
      setError("Selecione um desafio inscrito com grupo formado.");
      return;
    }

    try {
      await apiClient.request(
        { method: "POST", path: "/envios-desafios" },
        {
          body: {
            grupoId: selectedInscricao.grupo.id,
            description: data.get("description"),
            evidencias: [data.get("evidencia")],
            anexos: anexo ? [anexo] : [],
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

  const subscribedChallengeIds = new Set(inscricoes.map((inscricao) => getEntityId(inscricao.desafio)).filter(Boolean));
  const selectedInscricao = inscricoes.find((inscricao) => inscricao.id === selectedInscricaoId) || inscricoes[0];
  const selectedParticipants = getArray(selectedInscricao && selectedInscricao.grupo, "participantes");

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Desafios</h2>
            <p className="muted">Inscreva-se primeiro. O sistema monta seu grupo automaticamente.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <table className="table">
          <thead>
            <tr>
              <th>Desafio</th>
              <th>Pilar</th>
              <th>Pontos</th>
              <th>Entrega até</th>
              <th>Grupo</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {desafios.map((desafio) => {
              const isSubscribed = subscribedChallengeIds.has(desafio.id);
              return (
                <tr key={desafio.id}>
                  <td>
                    <strong>{desafio.title}</strong>
                    <p className="muted">{desafio.description}</p>
                  </td>
                  <td>{desafio.pilar ? desafio.pilar.name : "-"}</td>
                  <td>{formatNumber(desafio.points)}</td>
                  <td>{formatDate(desafio.deliveryDate || desafio.dataEntrega)}</td>
                  <td>{formatNumber(desafio.maxParticipantes)} participantes</td>
                  <td>
                    <button className="button secondary" type="button" disabled={isSubscribed} onClick={() => subscribe(desafio.id)}>
                      {isSubscribed ? "Inscrito" : "Inscrever-se"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Enviar desafio feito</h2>
            <p className="muted">Selecione uma inscrição. Os participantes vêm automaticamente do grupo.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={submitEnvio}>
          <label className="field span-2">
            <span>Desafio inscrito</span>
            <select required value={selectedInscricaoId} onChange={(event) => setSelectedInscricaoId(event.target.value)}>
              <option value="">Selecione</option>
              {inscricoes.map((inscricao) => (
                <option key={inscricao.id} value={inscricao.id}>
                  {inscricao.desafio ? inscricao.desafio.title : inscricao.id}
                </option>
              ))}
            </select>
          </label>
          <div className="span-2 status-item">
            <strong>Participantes do grupo</strong>
            <span className="muted">
              {selectedParticipants.length > 0
                ? selectedParticipants.map((participante) => participante.name || participante.id).join(", ")
                : "Nenhum grupo selecionado"}
            </span>
          </div>
          <label className="field span-2">
            <span>Descrição</span>
            <textarea name="description" required placeholder="Descreva o que foi feito." />
          </label>
          <label className="field span-2">
            <span>Evidência/link/comprovante</span>
            <input name="evidencia" required placeholder="https://..." />
          </label>
          <label className="field span-2">
            <span>Anexo</span>
            <input name="anexo" type="file" />
          </label>
          <button className="button" type="submit">
            Enviar para aprovação
          </button>
        </form>
        {inscricoes.length === 0 ? <Notice message="Você ainda não está inscrito em nenhum desafio ativo." /> : null}
      </section>

      <section className="panel">
        <h2>Meus desafios enviados</h2>
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

function StudentScoreView({ apiClient }) {
  const [score, setScore] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/pontuacoes/minha" });
      setScore(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  const pontosPorPilar = getArray(score, "pontosPorPilar");
  const historico = getArray(score, "historico");

  return (
    <div className="content">
      <section className="metrics">
        <div className="metric">
          <span className="muted">Pontuação total</span>
          <strong>{formatNumber(score && score.totalPontos)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Desafios aprovados</span>
          <strong>{formatNumber(score && score.desafiosAprovados)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Pilares pontuados</span>
          <strong>{formatNumber(pontosPorPilar.length)}</strong>
        </div>
      </section>
      <Notice message={error} type="error" />
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Minha Pontuação</h2>
            <p className="muted">Pontos concedidos após aprovação do professor.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <div className="status-grid">
          {pontosPorPilar.map((item) => (
            <div className="status-item" key={(item.pilar && item.pilar.id) || item.pilarId || item.pontos}>
              <strong>{item.pilar ? item.pilar.name : "Sem pilar"}</strong>
              <span className="muted">{formatNumber(item.pontos)} pontos</span>
              <span className="badge ok">{formatNumber(item.desafiosAprovados)} desafios</span>
            </div>
          ))}
        </div>
        {pontosPorPilar.length === 0 ? <Notice message="Ainda não há pontuação aprovada." /> : null}
      </section>

      <section className="panel">
        <h2>Histórico</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Desafio</th>
              <th>Pilar</th>
              <th>Pontos</th>
              <th>Turma</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((item) => (
              <tr key={item.id}>
                <td>{item.desafio ? item.desafio.title : item.envioId}</td>
                <td>{item.pilar ? item.pilar.name : "-"}</td>
                <td>{formatNumber(item.pontos)}</td>
                <td>{item.turma ? item.turma.name : "-"}</td>
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
  const [feedback, setFeedback] = useState("");
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

  async function updateContact(event, grupoId) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "PATCH", path: `/grupos/${grupoId}/contato` },
        {
          body: {
            tipo: data.get("tipo"),
            url: data.get("url"),
          },
        }
      );
      setFeedback("Contato do grupo atualizado.");
      await load();
    } catch (contactError) {
      setError(getErrorMessage(contactError));
    }
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Meus Grupos</h2>
            <p className="muted">Veja com quem você caiu no desafio e combine o canal de contato.</p>
          </div>
          <button className="button secondary" type="button" onClick={load}>
            Atualizar
          </button>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <div className="group-list">
          {grupos.map((grupo) => (
            <article className="status-item" key={grupo.id}>
              <div className="panel-header">
                <div>
                  <strong>{grupo.desafio ? grupo.desafio.title : grupo.id}</strong>
                  <p className="muted">
                    {grupo.turma ? grupo.turma.name : "-"} | {formatNumber(grupo.totalParticipantes)} de {formatNumber(grupo.maxParticipantes)} participantes
                  </p>
                </div>
                <span className={`badge ${grupo.status === "completo" ? "ok" : "warn"}`}>{grupo.status}</span>
              </div>
              <div className="participant-list">
                {getArray(grupo, "participantes").map((participante) => (
                  <span className="badge" key={participante.id || participante.name}>
                    {participante.name || participante.id}
                  </span>
                ))}
              </div>
              {grupo.contato && grupo.contato.url ? (
                <p className="muted">
                  Contato atual: {grupo.contato.tipo} - {grupo.contato.url}
                </p>
              ) : (
                <p className="muted">Contato do grupo ainda não informado.</p>
              )}
              <form className="form-grid" onSubmit={(event) => updateContact(event, grupo.id)}>
                <label className="field">
                  <span>Canal</span>
                  <select name="tipo" defaultValue={(grupo.contato && grupo.contato.tipo) || "whatsapp"}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                    <option value="discord">Discord</option>
                  </select>
                </label>
                <label className="field">
                  <span>Link de contato</span>
                  <input name="url" defaultValue={(grupo.contato && grupo.contato.url) || ""} placeholder="https://..." />
                </label>
                <button className="button secondary" type="submit">
                  Salvar contato
                </button>
              </form>
            </article>
          ))}
        </div>
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

function Workspace({ apiClient, onLogout, onThemeChange, onUserChange, theme, user }) {
  const [activeView, setActiveView] = useState(getInitialView(user));
  const [selectedMenu, setSelectedMenu] = useState(null);
  const role = getRole(user);
  const menu = MENU_BY_ROLE[role].filter((item) => !item.roles || item.roles.includes(user.role));

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
            <h1>{role === "admin" ? "Área do professor/admin" : "Área do aluno"}</h1>
            <p className="muted">API REST em {API_BASE_URL}</p>
          </div>
          <div className="actions">
            <button className="button secondary" type="button" onClick={onThemeChange}>
              Tema {theme === "dark" ? "claro" : "escuro"}
            </button>
          </div>
        </header>

        {activeView === "configuracoes" ? <ConfigurationView apiClient={apiClient} /> : null}
        {activeView === "dashboard" && role === "admin" ? <AdminDashboardView apiClient={apiClient} /> : null}
        {activeView === "alunos" ? <AdminStudentsView apiClient={apiClient} /> : null}
        {activeView === "turmas" ? <AdminTurmasView apiClient={apiClient} /> : null}
        {activeView === "pilares" ? <AdminPilaresView apiClient={apiClient} /> : null}
        {activeView === "desafios" && role === "admin" ? <AdminDesafiosView apiClient={apiClient} /> : null}
        {activeView === "desafios" && role === "aluno" ? <StudentChallengesView apiClient={apiClient} /> : null}
        {activeView === "aprovacoes" ? <AdminApprovalsView apiClient={apiClient} /> : null}
        {activeView === "ranking" ? <AdminRankingView apiClient={apiClient} /> : null}
        {activeView === "meus-grupos" ? <StudentGroupsView apiClient={apiClient} /> : null}
        {activeView === "pontuacao" ? <StudentScoreView apiClient={apiClient} /> : null}
        {activeView === "perfil" ? <ProfileView apiClient={apiClient} onUserChange={onUserChange} user={user} /> : null}
        {activeView === "inicio" ? <HomeView apiClient={apiClient} user={user} /> : null}
        {![
          "configuracoes",
          "dashboard",
          "alunos",
          "turmas",
          "pilares",
          "desafios",
          "aprovacoes",
          "ranking",
          "meus-grupos",
          "pontuacao",
          "perfil",
          "inicio",
        ].includes(activeView) ? (
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

  async function registerStudent(payload) {
    const result = await apiClient.request({ method: "POST", path: "/auth/register" }, { body: payload });
    const nextSession = { token: result.token, user: result.user };
    window.localStorage.setItem("desafios.session", JSON.stringify(nextSession));
    setSession(nextSession);
  }

  function updateSessionUser(user) {
    setSession((current) => {
      if (!current) return current;
      const nextSession = { ...current, user: { ...current.user, ...user } };
      window.localStorage.setItem("desafios.session", JSON.stringify(nextSession));
      return nextSession;
    });
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
        <Workspace
          apiClient={apiClient}
          onLogout={logout}
          onThemeChange={toggleTheme}
          onUserChange={updateSessionUser}
          theme={theme}
          user={session.user}
        />
      ) : (
        <LoginScreen theme={theme} onThemeChange={toggleTheme} onLogin={login} onRegister={registerStudent} />
      )}
    </div>
  );
}
