"use client";

import { useEffect, useMemo, useState } from "react";

import apiClientModule from "../lib/api-client";
import challengeSubscriptionModel from "../models/challenge-subscription.model";
import planoEstudoView from "../views/plano-estudo.view";

const { ENDPOINT_UNAVAILABLE_CODE, createApiClient } = apiClientModule;
const {
  getGroupParticipantNames,
  getSubmissionParticipantNames,
  getSubscriptionActionState,
  getSubscriptionMode,
  isChallengeActive,
} = challengeSubscriptionModel;
const {
  buildAgendaQuery,
  buildCalendarViewModel,
  buildChecklistSummaryViewModel,
  buildWeeklyStudyQuery,
  buildWeeklyStudySessions,
  calculateEndAtFromDuration,
  canToggleChecklistItem,
  formatCalendarDate,
  formatDateTimeInputValue,
  formatTime,
  getDateKeyFromDateTimeInput,
  getCurrentMonthRef,
  getStudyDurationMinutes,
  shiftMonth,
  toDateKey,
  toIsoFromDateTimeInput,
} = planoEstudoView;

const LIST_PAGE_SIZE = 10;
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

function resolveApiBaseUrl() {
  const configuredBaseUrl = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  const normalizedConfiguredBaseUrl = configuredBaseUrl.replace(/\/+$/, "");

  if (typeof window !== "undefined") {
    const { origin, hostname } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";

    if (normalizedConfiguredBaseUrl) {
      const configuredHostname = (() => {
        try {
          return new URL(normalizedConfiguredBaseUrl).hostname;
        } catch {
          return "";
        }
      })();
      const configuredIsLocalHost = configuredHostname === "localhost" || configuredHostname === "127.0.0.1";

      if (!configuredIsLocalHost || isLocalHost) return normalizedConfiguredBaseUrl;
    }

    if (!isLocalHost) return origin;
  }

  if (normalizedConfiguredBaseUrl) return normalizedConfiguredBaseUrl;

  return "http://localhost:3000";
}

const MENU_BY_ROLE = {
  aluno: [
    { key: "inicio", label: "Início", icon: "home", supported: true },
    { key: "desafios", label: "Desafios", icon: "emoji_events", supported: true },
    { key: "checklist", label: "Check-list", icon: "checklist", supported: true },
    { key: "perfil", label: "Meu Perfil", icon: "account_circle", supported: true },
    { key: "meus-grupos", label: "Meus Grupos", icon: "groups", supported: true },
    { key: "pontuacao", label: "Minha Pontuação", icon: "leaderboard", supported: true },
    { key: "plano-estudo", label: "Plano de Estudo", icon: "calendar_month", supported: true },
  ],
  admin: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", supported: true },
    { key: "alunos", label: "Alunos", icon: "school", supported: true },
    { key: "aprovacoes", label: "Aprovações", icon: "fact_check", supported: true },
    { key: "configuracoes", label: "Configurações", icon: "manage_accounts", supported: true, roles: ["admin"] },
    { key: "cupons", label: "Cupons", icon: "confirmation_number", supported: true },
    { key: "desafios", label: "Desafios", icon: "emoji_events", supported: true },
    { key: "pilares", label: "Pilares", icon: "account_tree", supported: true },
    { key: "plano-estudo", label: "Plano de Estudo", icon: "calendar_month", supported: true },
    { key: "ranking", label: "Ranking", icon: "leaderboard", supported: true },
    { key: "relatorios", label: "Relatórios", icon: "analytics", supported: true },
    { key: "turmas", label: "Turmas", icon: "groups_2", supported: true },
  ],
};

function getRole(user) {
  return user && (user.role === "admin" || user.role === "professor") ? "admin" : "aluno";
}

function getInitialView(user) {
  const role = getRole(user);
  if (typeof window !== "undefined") {
    const savedView = window.localStorage.getItem(`desafios.view.${role}`);
    if (savedView) return savedView;
  }
  return role === "admin" ? "dashboard" : "inicio";
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

function looksLikeObjectId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value.trim());
}

function getPilarPointsItems(desafio) {
  const configured = getArray(desafio && (desafio.pilares || desafio.pontosPorPilar))
    .map((item) => {
      const pilar = item.pilar || item;
      const pilarId = getEntityId(item.pilarId || item.pilar_id || pilar);
      const points = Number(item.points || item.pontos || item.pontuacao || 0);

      return pilarId
        ? {
            pilar,
            pilarId,
            points,
          }
        : null;
    })
    .filter(Boolean);

  if (configured.length > 0) return configured;

  const legacyPilar = desafio && desafio.pilar;
  const legacyPilarId = getEntityId(legacyPilar || (desafio && desafio.pilarId));
  const legacyPoints = Number((desafio && desafio.points) || 0);

  return legacyPilarId ? [{ pilar: legacyPilar, pilarId: legacyPilarId, points: legacyPoints }] : [];
}

function formatPilarPoints(desafio) {
  const items = getPilarPointsItems(desafio);
  if (items.length === 0) return "-";

  return items
    .map((item) => {
      const name = item.pilar && typeof item.pilar === "object" ? item.pilar.name || "Pilar não informado" : "Pilar não informado";
      return `${name}: ${formatNumber(item.points)} pts`;
    })
    .join(", ");
}

function getPilarPointValue(desafio, pilarId, fallback = 0) {
  const item = getPilarPointsItems(desafio).find((current) => current.pilarId === pilarId);
  return item ? Number(item.points || 0) : fallback;
}

function isPilarSelected(desafio, pilarId) {
  return getPilarPointsItems(desafio).some((item) => item.pilarId === pilarId);
}

function buildPilaresPayloadFromForm(data, fieldPrefix = "") {
  const selectedIds = data.getAll(`${fieldPrefix}PilarIds`).map(String);

  return selectedIds.map((pilarId) => {
    const points = Number(data.get(`${fieldPrefix}PilarPoints_${pilarId}`) || 0);
    if (!Number.isFinite(points) || points <= 0) {
      throw new Error("Cada pilar selecionado deve ter pontuação maior que zero. Desmarque o pilar ou informe um valor positivo.");
    }
    return { pilarId, points };
  });
}

function isQuizChallenge(desafio) {
  return String((desafio && (desafio.challengeType || desafio.tipoDesafio)) || "").trim().toLowerCase() === "quiz";
}

function createEmptyQuizQuestion() {
  return {
    prompt: "",
    alternatives: ["", "", "", "", ""],
    correctAlternative: 0,
  };
}

function normalizeQuizQuestionsForForm(desafio) {
  const questions = getArray(desafio && desafio.quiz, "questions").length > 0
    ? getArray(desafio.quiz, "questions")
    : getArray(desafio, "perguntas");
  if (questions.length === 0) return [createEmptyQuizQuestion()];

  return questions.map((question) => ({
    id: getEntityId(question),
    prompt: question.prompt || question.question || question.enunciado || "",
    alternatives: Array.from({ length: 5 }, (_, index) => {
      const alternative = getArray(question, "alternatives")[index] || getArray(question, "alternativas")[index];
      return typeof alternative === "object" ? alternative.text || alternative.texto || "" : alternative || "";
    }),
    correctAlternative: Number(question.correctAlternative ?? question.alternativaCorreta ?? 0),
  }));
}

function getQuizFinalContentUrl(desafio) {
  return String((desafio && desafio.quiz && (desafio.quiz.finalContentUrl || desafio.quiz.linkConteudoFinal)) || "");
}

function validateQuizQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) throw new Error("Adicione ao menos uma pergunta ao questionário.");
  questions.forEach((question, questionIndex) => {
    if (!String(question.prompt || "").trim()) throw new Error(`Informe o enunciado da pergunta ${questionIndex + 1}.`);
    if (!Array.isArray(question.alternatives) || question.alternatives.length !== 5) {
      throw new Error(`A pergunta ${questionIndex + 1} deve ter exatamente 5 alternativas.`);
    }
    question.alternatives.forEach((alternative, alternativeIndex) => {
      if (!String(alternative || "").trim()) throw new Error(`Informe a alternativa ${alternativeIndex + 1} da pergunta ${questionIndex + 1}.`);
    });
    if (!Number.isInteger(Number(question.correctAlternative)) || Number(question.correctAlternative) < 0 || Number(question.correctAlternative) > 4) {
      throw new Error(`Selecione a alternativa correta da pergunta ${questionIndex + 1}.`);
    }
  });
}

function QuizQuestionEditor({ questions, setQuestions }) {
  function updateQuestion(questionIndex, field, value) {
    setQuestions((current) => current.map((question, index) => (index === questionIndex ? { ...question, [field]: value } : question)));
  }

  function updateAlternative(questionIndex, alternativeIndex, value) {
    setQuestions((current) =>
      current.map((question, index) =>
        index === questionIndex
          ? { ...question, alternatives: question.alternatives.map((alternative, itemIndex) => (itemIndex === alternativeIndex ? value : alternative)) }
          : question
      )
    );
  }

  function removeQuestion(questionIndex) {
    setQuestions((current) => current.filter((_, index) => index !== questionIndex));
  }

  return (
    <div className="quiz-question-builder">
      {questions.map((question, questionIndex) => (
        <fieldset className="quiz-question" key={question.id || questionIndex}>
          <div className="quiz-question-header">
            <strong>Pergunta {questionIndex + 1}</strong>
            {questions.length > 1 ? (
              <button className="button ghost with-icon" type="button" onClick={() => removeQuestion(questionIndex)}>
                <ButtonIcon name="delete" />
                Remover pergunta
              </button>
            ) : null}
          </div>
          <label className="field">
            <span>Enunciado</span>
            <textarea
              maxLength={1000}
              required
              value={question.prompt}
              onChange={(event) => updateQuestion(questionIndex, "prompt", event.target.value)}
              placeholder="Digite a pergunta para o aluno."
            />
          </label>
          <div className="quiz-alternatives">
            <span className="muted">Alternativas: marque uma como correta.</span>
            {question.alternatives.map((alternative, alternativeIndex) => (
              <div className="quiz-alternative-row" key={alternativeIndex}>
                <label className="quiz-correct-option">
                  <input
                    checked={Number(question.correctAlternative) === alternativeIndex}
                    name={`quiz-correct-${questionIndex}`}
                    type="radio"
                    onChange={() => updateQuestion(questionIndex, "correctAlternative", alternativeIndex)}
                  />
                  <span>Correta</span>
                </label>
                <input
                  aria-label={`Alternativa ${alternativeIndex + 1} da pergunta ${questionIndex + 1}`}
                  maxLength={500}
                  required
                  value={alternative}
                  onChange={(event) => updateAlternative(questionIndex, alternativeIndex, event.target.value)}
                  placeholder={`Alternativa ${alternativeIndex + 1}`}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <button
        className="button secondary with-icon"
        disabled={questions.length >= 50}
        type="button"
        onClick={() => setQuestions((current) => [...current, createEmptyQuizQuestion()])}
      >
        <ButtonIcon name="add" />
        Adicionar pergunta
      </button>
    </div>
  );
}

function formatTurmaName(turma) {
  if (!turma) return "-";
  if (typeof turma === "string") return looksLikeObjectId(turma) ? "-" : turma;
  return turma.name || turma.code || "-";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function formatRole(value) {
  const labels = { aluno: "Aluno", professor: "Professor", admin: "Administrador" };
  return labels[String(value || "").trim().toLowerCase()] || value || "Não informado";
}

function formatStatus(value) {
  const labels = {
    ativo: "Ativo",
    inativo: "Inativo",
    ativa: "Ativa",
    inativa: "Inativa",
    encerrada: "Encerrada",
    pendente: "Pendente",
    aprovado: "Aprovado",
    reprovado: "Reprovado",
    ajuste: "Em ajuste",
    cancelado: "Cancelado",
    inscrito: "Inscrito",
    formando: "Formando",
    completo: "Completo",
    removida: "Removida",
    apagado: "Apagado",
  };
  return labels[String(value || "").trim().toLowerCase()] || value || "Não informado";
}

function formatSubmissionType(value) {
  const labels = { individual: "Individual", grupo: "Grupo" };
  return labels[String(value || "").trim().toLowerCase()] || value || "Não informado";
}

function getLuckyNumberValues(value) {
  return getArray(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
    .sort((left, right) => left - right);
}

function formatLuckyNumbers(value) {
  const numbers = getLuckyNumberValues(value);
  return numbers.length > 0 ? numbers.map((item) => `#${formatNumber(item)}`).join(", ") : "";
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

function isOpenableLink(value) {
  return /^(https?:\/\/|data:|blob:)/i.test(String(value || "").trim());
}

function normalizeOpenableHref(value) {
  const href = String(value || "").trim();
  if (/^www\./i.test(href)) return `https://${href}`;
  return isOpenableLink(href) ? href : "";
}

function getDisplayLinkLabel(item, fallback) {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item !== "object") return String(item).trim();

  return String(item.name || item.nome || item.filename || item.fileName || item.url || item.link || item.text || item.texto || fallback || "").trim();
}

function getDisplayLinkHref(item) {
  if (!item) return "";
  if (typeof item === "string") return normalizeOpenableHref(item);
  if (typeof item !== "object") return "";

  return normalizeOpenableHref(item.url || item.link || item.content || item.dataUrl || item.dataURL || item.text || item.texto);
}

function hasOpenableContent(href) {
  if (!href) return false;
  if (!/^data:/i.test(href)) return true;
  const separatorIndex = href.indexOf(",");
  return separatorIndex >= 0 && href.slice(separatorIndex + 1).trim().length > 0;
}

function LinkList({ download = false, emptyMessage, items }) {
  const links = getArray(items)
    .map((item, index) => {
      const href = getDisplayLinkHref(item);
      if (download && href && !hasOpenableContent(href)) return null;
      const explicitLabel = getDisplayLinkLabel(item, "");
      if (download && !href && !explicitLabel) return null;
      const label = explicitLabel || (href ? "Abrir link" : `Item ${index + 1}`);
      return label ? { href, label } : null;
    })
    .filter(Boolean);

  if (links.length === 0) {
    return emptyMessage ? <strong>{emptyMessage}</strong> : null;
  }

  return (
    <div className="link-list">
      {links.map((link, index) =>
        link.href ? (
          <a download={download ? link.label : undefined} href={link.href} key={`${link.label}-${index}`} rel="noreferrer" target="_blank">
            {link.label}
          </a>
        ) : (
          <span key={`${link.label}-${index}`}>{link.label}</span>
        )
      )}
    </div>
  );
}

function todaySuffix() {
  return new Date().toISOString().slice(0, 10);
}

function readFileAsAttachment(file) {
  if (!file || !file.name) return Promise.resolve(null);
  if (Number(file.size) <= 0) return Promise.reject(new Error("O anexo não pode estar vazio."));
  if (Number(file.size) > MAX_ATTACHMENT_SIZE_BYTES) return Promise.reject(new Error("Cada anexo deve ter no máximo 10 MB."));

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

function readFileAsText(file) {
  if (!file || !file.name) return Promise.resolve("");
  if (!/\.csv$/i.test(file.name)) return Promise.reject(new Error("Selecione um arquivo CSV (.csv)."));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Não foi possível ler o arquivo."));
    reader.readAsText(file);
  });
}

function Icon({ filled = false, name }) {
  return (
    <span aria-hidden="true" className={`material-symbols-rounded${filled ? " filled" : ""}`}>
      {name}
    </span>
  );
}

function IconButton({ className = "button secondary", disabled = false, icon, label, name, onClick, type = "button", value }) {
  return (
    <button
      aria-label={label}
      className={`${className} icon-button`}
      disabled={disabled}
      name={name}
      onClick={onClick}
      title={label}
      type={type}
      value={value}
    >
      <Icon name={icon} />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function ButtonIcon({ name }) {
  return <Icon name={name} />;
}

function Notice({ message, type = "neutral" }) {
  if (!message) return null;
  return <div className={`alert ${type === "error" ? "" : "neutral"}`}>{message}</div>;
}

function buildListPath(path, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function getPagination(result) {
  return (result && result.pagination) || { page: 1, limit: LIST_PAGE_SIZE, total: 0, totalPages: 0 };
}

function PaginationControls({ label, onPageChange, pagination }) {
  if (!pagination || Number(pagination.totalPages || 0) <= 1) return null;

  const currentPage = Number(pagination.page || 1);
  const totalPages = Number(pagination.totalPages || 1);

  return (
    <div className="pagination" aria-label={label || "Paginação"}>
      <IconButton disabled={currentPage <= 1} icon="chevron_left" label="Página anterior" onClick={() => onPageChange(currentPage - 1)} />
      <span className="muted">
        Página {currentPage} de {totalPages}
      </span>
      <IconButton disabled={currentPage >= totalPages} icon="chevron_right" label="Próxima página" onClick={() => onPageChange(currentPage + 1)} />
    </div>
  );
}

function LoginScreen({ theme, onThemeChange, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
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

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand">
          <img className="brand-logo" src="/logo-mentoria-wordmark.png" alt="Mentoria 2.0" width="132" height="61" />
          <div>
            <h1>Desafios Mentoria 2.0</h1>
            <p className="muted">Painel Alavanque</p>
          </div>
        </div>

        <form className="login-form" onSubmit={submitLogin}>
          <label className="field">
            <span>E-mail</span>
            <input value={email} autoComplete="email" maxLength={255} onChange={(event) => setEmail(event.target.value)} required type="email" />
          </label>
          <label className="field">
            <span>Senha</span>
            <div className="password-input">
              <input
                value={password}
                type={passwordVisible ? "text" : "password"}
                autoComplete="current-password"
                minLength={6}
                required
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
                className="password-visibility"
                onClick={() => setPasswordVisible((visible) => !visible)}
                title={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
                type="button"
              >
                <Icon name={passwordVisible ? "visibility_off" : "visibility"} />
              </button>
            </div>
          </label>
          {error ? <div className="alert">{error}</div> : null}
          <button className="button with-icon" type="submit" disabled={loading}>
            <ButtonIcon name="login" />
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="actions">
          <IconButton className="button ghost" icon={theme === "dark" ? "light_mode" : "dark_mode"} label={`Tema ${theme === "dark" ? "claro" : "escuro"}`} onClick={onThemeChange} />
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
        <img className="brand-logo" src="/logo-mentoria-wordmark.png" alt="Mentoria 2.0" width="108" height="50" />
        <div>
          <h3>{user.name}</h3>
          <p className="muted">{formatRole(user.role)}</p>
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
            <span className="nav-label">
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </span>
            {!item.supported ? <span className="badge off">MVP</span> : null}
          </button>
        ))}
      </nav>

      <button className="button secondary with-icon" type="button" onClick={onLogout}>
        <ButtonIcon name="logout" />
        Sair
      </button>
    </aside>
  );
}

function ConfigurationView({ apiClient }) {
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "", role: "", status: "" });
  const [pagination, setPagination] = useState(getPagination());
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function buildUsersPath(nextFilters = filters, nextPage = pagination.page || 1) {
    return buildListPath("/users", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
      role: nextFilters.role,
      status: nextFilters.status,
    });
  }

  async function load(nextFilters = filters, nextPage = pagination.page || 1) {
    setError("");
    setLoading(true);
    try {
      const result = await apiClient.request({ method: "GET", path: buildUsersPath(nextFilters, nextPage) });
      setUsers(getArray(result, "users").length > 0 ? getArray(result, "users") : getArray(result, "usuarios"));
      setPagination(getPagination(result));
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
    await load(filters, 1);
  }

  async function goToPage(page) {
    await load(filters, page);
  }

  async function createUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFeedback("");
    setError("");
    setCreating(true);
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
      form.reset();
      setFeedback("Usuário cadastrado com sucesso.");
      await load(filters, 1);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreating(false);
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

  async function deleteUser(managedUser) {
    if (typeof window !== "undefined" && !window.confirm(`Excluir o usuário ${managedUser.name}?`)) return;

    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "DELETE", path: `/users/${managedUser.id}` });
      if (editing && editing.id === managedUser.id) setEditing(null);
      setFeedback("Usuário inativado com sucesso.");
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
            <h2>Configurações</h2>
            <p className="muted">Gestão de usuários e perfis do sistema.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar usuários" onClick={() => load()} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />

        <form className="form-grid" onSubmit={createUser}>
          <label className="field">
            <span>Nome</span>
            <input name="name" maxLength={120} required placeholder="Nome completo" />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input name="email" maxLength={255} required type="email" placeholder="usuario@exemplo.com" />
          </label>
          <label className="field">
            <span>Senha inicial</span>
            <input name="password" minLength={6} required type="password" defaultValue="Teste@123" />
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
          <IconButton className="button" disabled={creating} icon="person_add" label="Cadastrar usuário" type="submit" />
        </form>
      </section>

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Editar usuário</h2>
              <p className="muted">Atualize dados, senha, status e perfil de acesso.</p>
            </div>
            <IconButton className="button ghost" icon="close" label="Cancelar edição" onClick={() => setEditing(null)} />
          </div>
          <form className="form-grid" key={editing.id} onSubmit={updateUser}>
            <label className="field">
              <span>Nome</span>
              <input name="editName" maxLength={120} required defaultValue={editing.name} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input name="editEmail" maxLength={255} required type="email" defaultValue={editing.email} />
            </label>
            <label className="field">
              <span>Nova senha</span>
              <input name="editPassword" minLength={6} type="password" placeholder="Preencha apenas se for alterar" />
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
            <IconButton className="button" icon="save" label="Salvar usuário" type="submit" />
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
          <IconButton icon="filter_alt" label="Filtrar usuários" type="submit" />
        </form>

        {loading ? <Notice message="Carregando usuários..." /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((managedUser) => (
              <tr key={managedUser.id}>
                <td>{managedUser.name}</td>
                <td>{managedUser.email}</td>
                <td>{formatRole(managedUser.role)}</td>
                <td>{formatStatus(managedUser.status)}</td>
                <td>
                  <div className="actions table-actions">
                    <IconButton icon="edit" label={`Editar ${managedUser.name}`} onClick={() => setEditing(managedUser)} />
                    <IconButton className="button ghost" icon="delete" label={`Excluir ${managedUser.name}`} onClick={() => deleteUser(managedUser)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls label="Paginação de usuários" onPageChange={goToPage} pagination={pagination} />
        {!loading && users.length === 0 ? <Notice message="Nenhum usuário encontrado para o filtro informado." /> : null}
      </section>
    </div>
  );
}
function ProfileView({ apiClient, user, onUserChange }) {
  const [profile, setProfile] = useState(user);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [currentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);

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
    const form = event.currentTarget;
    const data = new FormData(form);
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
      form.elements.currentPassword.value = "";
      form.elements.newPassword.value = "";
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
          <IconButton icon="refresh" label="Atualizar perfil" onClick={load} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" key={`${profile.id || profile.email || "perfil"}-${profile.name || ""}`} onSubmit={updateProfile}>
          <label className="field">
            <span>Nome completo</span>
            <input name="name" maxLength={120} required defaultValue={profile.name} />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input value={profile.email || ""} disabled readOnly />
          </label>
          <label className="field">
            <span>Senha atual</span>
            <div className="password-input">
              <input name="currentPassword" type={currentPasswordVisible ? "text" : "password"} autoComplete="current-password" />
              <button
                aria-label={currentPasswordVisible ? "Ocultar senha atual" : "Mostrar senha atual"}
                className="password-visibility"
                onClick={() => setCurrentPasswordVisible((visible) => !visible)}
                title={currentPasswordVisible ? "Ocultar senha atual" : "Mostrar senha atual"}
                type="button"
              >
                <Icon name={currentPasswordVisible ? "visibility_off" : "visibility"} />
              </button>
            </div>
          </label>
          <label className="field">
            <span>Nova senha</span>
            <div className="password-input">
              <input name="newPassword" type={newPasswordVisible ? "text" : "password"} autoComplete="new-password" />
              <button
                aria-label={newPasswordVisible ? "Ocultar nova senha" : "Mostrar nova senha"}
                className="password-visibility"
                onClick={() => setNewPasswordVisible((visible) => !visible)}
                title={newPasswordVisible ? "Ocultar nova senha" : "Mostrar nova senha"}
                type="button"
              >
                <Icon name={newPasswordVisible ? "visibility_off" : "visibility"} />
              </button>
            </div>
          </label>
            <button className="button with-icon" type="submit">
              <ButtonIcon name="save" />
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
              <td>{formatRole(profile.role)}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>{formatStatus(profile.status)}</td>
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
  const totalDesafios = dashboard
    ? dashboard.desafiosAtivos || dashboard.quantidadeDesafios || (dashboard.desafiosEnviados ? dashboard.desafiosEnviados.total : 0)
    : 0;
  const cupons = (dashboard && dashboard.cupons) || {};
  const cupomItens = getArray(cupons, "itens");
  const numerosDaSorte = getLuckyNumberValues(cupons.numerosDaSorte);

  return (
    <div className="content">
      <section className="student-hero panel">
        <div>
          <span className="muted">Nome do Aluno</span>
          <h2>{user.name}</h2>
        </div>
        <IconButton icon="refresh" label="Atualizar início" onClick={load} />
      </section>
      <Notice message={error} type="error" />
      <section className="metrics metrics-4 student-metrics">
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
        <div className="metric">
          <span className="muted">Cupons <span className="student-metrics-label-extra">conquistados</span></span>
          <strong>{formatNumber(cupons.totalCupons)}</strong>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Meus cupons</h2>
            <p className="muted">A cada 10 pontos você conquista 1 cupom. Eles ficam pendentes até a aprovação de um desafio com certificado postado.</p>
          </div>
        </div>
        <div className="status-grid">
          <div className="status-item">
            <span className="muted">Cupons validados</span>
            <strong>{formatNumber(cupons.cuponsValidados)}</strong>
            <span className="muted">{cupons.ultimaValidacaoEm ? `Última validação em ${formatDate(cupons.ultimaValidacaoEm)}` : "Nenhum cupom validado ainda."}</span>
          </div>
          <div className="status-item">
            <span className="muted">Cupons pendentes</span>
            <strong>{formatNumber(cupons.cuponsPendentes)}</strong>
            <span className="muted">{cupons.ultimoConquistadoEm ? `Última conquista em ${formatDate(cupons.ultimoConquistadoEm)}` : "Nenhum cupom conquistado ainda."}</span>
          </div>
          <div className="status-item span-2">
            <span className="muted">Números da sorte</span>
            <strong>{numerosDaSorte.length > 0 ? formatLuckyNumbers(numerosDaSorte) : "Nenhum número da sorte distribuído ainda."}</strong>
            <span className="muted">
              {numerosDaSorte.length > 0
                ? `Última distribuição em ${formatDate(cupons.ultimoNumeroSorteDistribuidoEm)}`
                : Number(cupons.cuponsAguardandoNumeroSorte || 0) > 0
                  ? "Você já tem cupons validados aguardando a distribuição manual do administrador."
                  : "Os números da sorte aparecem aqui depois da distribuição manual do administrador."}
            </span>
          </div>
        </div>
        {cupomItens.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Cupom</th>
                <th>Conquistado em</th>
                <th>Status</th>
                <th>Validação</th>
                <th>Número da sorte</th>
              </tr>
            </thead>
            <tbody>
              {cupomItens.map((cupom) => (
                <tr key={cupom.id}>
                  <td>#{formatNumber(cupom.numero)}</td>
                  <td>{formatDate(cupom.conquistadoEm)}</td>
                  <td>
                    <span className={`badge ${cupom.validado ? "ok" : "warn"}`}>{cupom.validado ? "Validado" : "Pendente"}</span>
                  </td>
                  <td>
                    {cupom.validado ? `${formatDate(cupom.validadoEm)}${cupom.desafioValidacao ? ` · ${cupom.desafioValidacao.title}` : ""}` : "Aguardando desafio com certificado postado"}
                  </td>
                  <td>
                    {cupom.temNumeroSorte
                      ? `#${formatNumber(cupom.numeroSorte)}`
                      : cupom.validado
                        ? "Aguardando distribuição do administrador"
                        : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Notice message="Nenhum cupom conquistado até o momento." />
        )}
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
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [distributing, setDistributing] = useState(false);

  async function load() {
    setError("");
    try {
      const result = await apiClient.request({ method: "GET", path: "/dashboard/admin" });
      setDashboard(result);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  async function distributeLuckyNumbers() {
    setFeedback("");
    setError("");
    setDistributing(true);
    try {
      const result = await apiClient.request({ method: "POST", path: "/cupons/distribuicao/numeros-sorte" });
      const resumo = (result && result.resumo) || {};
      setFeedback(
        Number(resumo.numerosDistribuidos || 0) > 0
          ? `Distribuição concluída: ${formatNumber(resumo.numerosDistribuidos)} novo(s) número(s) da sorte distribuído(s). Total atual: ${formatNumber(
              resumo.totalNumerosDistribuidos
            )}.`
          : Number(resumo.totalNumerosDistribuidos || 0) > 0
            ? `Nenhum cupom novo precisava de numeração. Os ${formatNumber(resumo.totalNumerosDistribuidos)} número(s) já distribuídos foram preservados.`
            : "Nenhum cupom validado disponível para distribuir no momento."
      );
      await load();
    } catch (distributionError) {
      setError(getErrorMessage(distributionError));
    } finally {
      setDistributing(false);
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
          <div className="actions">
            <button className="button secondary with-icon" disabled={distributing} onClick={distributeLuckyNumbers} type="button">
              <ButtonIcon name="casino" />
              {distributing ? "Distribuindo..." : "Distribuir Números dos Cupons"}
            </button>
            <IconButton icon="refresh" label="Atualizar dashboard" onClick={load} />
          </div>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
      </section>

      <section className="metrics metrics-4">
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
        <div className="metric">
          <span className="muted">Cupons gerados</span>
          <strong>{formatNumber(indicadores.cuponsGerados)}</strong>
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
  const [importFormKey, setImportFormKey] = useState(0);
  const [filters, setFilters] = useState({ search: "" });
  const [pagination, setPagination] = useState(getPagination());
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);

  function buildStudentsPath(nextFilters = filters, nextPage = pagination.page || 1) {
    return buildListPath("/alunos", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
    });
  }

  async function load(nextFilters = filters, nextPage = pagination.page || 1) {
    setError("");
    setLoading(true);
    try {
      const [studentsResult, turmasResult] = await Promise.all([
        apiClient.request({ method: "GET", path: buildStudentsPath(nextFilters, nextPage) }),
        apiClient.request({ method: "GET", path: "/turmas?limit=100&status=ativa" }),
      ]);
      setStudents(getArray(studentsResult, "alunos"));
      setPagination(getPagination(studentsResult));
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

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    await load(filters, 1);
  }

  async function goToPage(page) {
    await load(filters, page);
  }

  async function createStudent(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError("");
    setFeedback("");
    setCreating(true);
    try {
      await apiClient.request(
        { method: "POST", path: "/alunos" },
        {
          body: {
            name: data.get("name"),
            email: data.get("email"),
            password: data.get("password"),
            turmaId: data.get("turmaId") || undefined,
            discordJoined: data.get("discordJoined") === "on",
            status: "ativo",
          },
        }
      );
      form.reset();
      setFeedback("Aluno cadastrado com sucesso.");
      await load(filters, 1);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  async function importStudents(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setFeedback("");
    setImporting(true);
    try {
      const csv = await readFileAsText(data.get("csvFile"));
      const result = await apiClient.request({ method: "POST", path: "/alunos/importar" }, { body: { csv } });
      const importacao = result && result.importacao ? result.importacao : {};
      const importados = Number(importacao.importados || 0);
      const falhas = Number(importacao.falhas || 0);
      setImportFormKey((current) => current + 1);
      setFeedback(`Importação finalizada: ${importados} aluno(s) importado(s), ${falhas} falha(s).`);
      if (falhas > 0) {
        setError(
          getArray(importacao, "erros")
            .slice(0, 5)
            .map((erro) => `Linha ${erro.linha}: ${erro.message}`)
            .join(" | ")
        );
      }
      await load(filters, 1);
    } catch (importError) {
      setError(getErrorMessage(importError));
    } finally {
      setImporting(false);
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
            discordJoined: data.get("editDiscordJoined") === "on",
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

  async function deleteStudent(student) {
    if (typeof window !== "undefined" && !window.confirm(`Excluir o aluno ${student.name}?`)) return;

    setError("");
    setFeedback("");
    try {
      await apiClient.request({ method: "DELETE", path: `/alunos/${student.id}` });
      if (editing && editing.id === student.id) setEditing(null);
      setFeedback("Aluno excluído com sucesso.");
      await load(filters, 1);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  function getStudentTurmaNames(student) {
    const ids = student && Array.isArray(student.turmas) ? student.turmas : [];
    if (ids.length === 0) return "Sem turma";
    const names = ids
      .map((id) => {
        const turma = turmas.find((item) => item.id === id);
        return turma ? turma.name : null;
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "Sem turma";
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Alunos</h2>
            <p className="muted">Cadastre, edite e gerencie alunos da mentoria.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar alunos" onClick={() => load()} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={createStudent}>
          <label className="field">
            <span>Nome</span>
            <input name="name" maxLength={120} required placeholder={`Aluno ${todaySuffix()}`} />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input name="email" maxLength={255} required type="email" placeholder="aluno@exemplo.com" />
          </label>
          <label className="field">
            <span>Senha inicial</span>
            <input name="password" minLength={6} required type="password" defaultValue="Teste@123" />
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
          <label className="checkbox-field span-2">
            <input name="discordJoined" type="checkbox" />
            <span>Aluno entrou no Discord</span>
          </label>
          <IconButton className="button" disabled={creating} icon="person_add" label="Cadastrar aluno" type="submit" />
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Importar em Lotes</h2>
            <p className="muted">CSV com as colunas Nome, E-mail, Senha Inicial e Turma.</p>
          </div>
        </div>
        <form className="inline-form" key={importFormKey} onSubmit={importStudents}>
          <label className="field">
            <span>Arquivo CSV</span>
            <input name="csvFile" required type="file" accept=".csv,text/csv" />
          </label>
          <button className="button secondary with-icon" disabled={importing} type="submit">
            <ButtonIcon name="upload_file" />
            {importing ? "Importando..." : "Importar em Lotes"}
          </button>
        </form>
      </section>

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Editar aluno</h2>
            <IconButton className="button ghost" icon="close" label="Cancelar edição" onClick={() => setEditing(null)} />
          </div>
          <form className="form-grid" onSubmit={updateStudent}>
            <label className="field">
              <span>Nome</span>
              <input name="editName" maxLength={120} required defaultValue={editing.name} />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input name="editEmail" maxLength={255} required type="email" defaultValue={editing.email} />
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
              <input name="editPassword" minLength={6} type="password" placeholder="Preencha apenas se for alterar" />
            </label>
            <label className="checkbox-field span-2">
              <input name="editDiscordJoined" type="checkbox" defaultChecked={editing.discordJoined === true || editing.entrouNoDiscord === true} />
              <span>Aluno entrou no Discord</span>
            </label>
            <IconButton className="button" icon="save" label="Salvar edição do aluno" type="submit" />
          </form>
        </section>
      ) : null}

      <section className="panel">
        <h2>Lista de alunos</h2>
        <form className="toolbar" onSubmit={applyFilters}>
          <label className="field">
            <span>Filtrar por nome do aluno</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Digite parte do nome" />
          </label>
          <IconButton icon="filter_alt" label="Filtrar alunos" type="submit" />
        </form>
        {loading ? <Notice message="Carregando alunos..." /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Turma</th>
              <th>Discord</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>{student.email}</td>
                <td>{getStudentTurmaNames(student)}</td>
                <td>
                  <span className={`badge ${student.discordJoined || student.entrouNoDiscord ? "ok" : "off"}`}>
                    {student.discordJoined || student.entrouNoDiscord ? "Sim" : "Não"}
                  </span>
                </td>
                <td>{formatStatus(student.status)}</td>
                <td>
                  <div className="actions table-actions">
                    <IconButton icon="edit" label={`Editar ${student.name}`} onClick={() => setEditing(student)} />
                    <IconButton className="button ghost" icon="delete" label={`Excluir ${student.name}`} onClick={() => deleteStudent(student)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls label="Paginação de alunos" onPageChange={goToPage} pagination={pagination} />
        {!loading && students.length === 0 ? <Notice message="Nenhum aluno encontrado para o filtro informado." /> : null}
      </section>
    </div>
  );
}

function AdminCouponsView({ apiClient }) {
  const [rows, setRows] = useState([]);
  const [luckyCouponRows, setLuckyCouponRows] = useState([]);
  const [filters, setFilters] = useState({ search: "" });
  const [pagination, setPagination] = useState(getPagination());
  const [luckyCouponPagination, setLuckyCouponPagination] = useState(getPagination());
  const [luckyCouponSummary, setLuckyCouponSummary] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function buildCouponsPath(nextFilters = filters, nextPage = pagination.page || 1) {
    return buildListPath("/cupons/alunos", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
    });
  }

  function buildLuckyCouponsPath(nextFilters = filters, nextPage = luckyCouponPagination.page || 1) {
    return buildListPath("/cupons/numeros-sorte", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
    });
  }

  async function load(nextFilters = filters, nextPage = pagination.page || 1, nextLuckyPage = luckyCouponPagination.page || 1) {
    setError("");
    setLoading(true);
    try {
      const [studentsResult, luckyCouponsResult] = await Promise.all([
        apiClient.request({ method: "GET", path: buildCouponsPath(nextFilters, nextPage) }),
        apiClient.request({ method: "GET", path: buildLuckyCouponsPath(nextFilters, nextLuckyPage) }),
      ]);
      setRows(getArray(studentsResult, "alunos"));
      setPagination(getPagination(studentsResult));
      setLuckyCouponRows(getArray(luckyCouponsResult, "cupons"));
      setLuckyCouponPagination(getPagination(luckyCouponsResult));
      setLuckyCouponSummary((luckyCouponsResult && luckyCouponsResult.resumo) || {});
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
    await load(filters, 1, 1);
  }

  async function goToPage(page) {
    await load(filters, page, luckyCouponPagination.page || 1);
  }

  async function goToLuckyCouponPage(page) {
    await load(filters, pagination.page || 1, page);
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Cupons dos alunos</h2>
            <p className="muted">Acompanhe quantos cupons cada aluno já conquistou e quantos ainda aguardam validação.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar cupons" onClick={() => load()} />
        </div>
        <Notice message={error} type="error" />
        <form className="toolbar" onSubmit={applyFilters}>
          <label className="field">
            <span>Filtrar por nome do aluno</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Digite parte do nome" />
          </label>
          <IconButton icon="filter_alt" label="Filtrar cupons" type="submit" />
        </form>
        {loading ? <Notice message="Carregando cupons..." /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Aluno</th>
              <th>Total de cupons</th>
              <th>Validados</th>
              <th>Pendentes</th>
              <th>Última conquista</th>
              <th>Última validação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={(row.aluno && row.aluno.id) || row.totalCupons}>
                <td>
                  <strong>{row.aluno ? row.aluno.name : "Aluno não informado"}</strong>
                  <div className="muted">{row.aluno ? row.aluno.email : "-"}</div>
                </td>
                <td>{formatNumber(row.totalCupons)}</td>
                <td>{formatNumber(row.cuponsValidados)}</td>
                <td>{formatNumber(row.cuponsPendentes)}</td>
                <td>{row.ultimoConquistadoEm ? formatDate(row.ultimoConquistadoEm) : "-"}</td>
                <td>{row.ultimaValidacaoEm ? formatDate(row.ultimaValidacaoEm) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls label="Paginação de cupons" onPageChange={goToPage} pagination={pagination} />
        {!loading && rows.length === 0 ? <Notice message="Nenhum aluno encontrado para o filtro informado." /> : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Listagem global dos números da sorte</h2>
            <p className="muted">Relação cupom por cupom em ordem de validação, com o número da sorte de cada registro.</p>
          </div>
        </div>
        <div className="metrics">
          <div className="metric">
            <span className="muted">Cupons validados</span>
            <strong>{formatNumber(luckyCouponSummary.totalCuponsValidados)}</strong>
          </div>
          <div className="metric">
            <span className="muted">Com número da sorte</span>
            <strong>{formatNumber(luckyCouponSummary.cuponsDistribuidos)}</strong>
          </div>
          <div className="metric">
            <span className="muted">Aguardando distribuição</span>
            <strong>{formatNumber(luckyCouponSummary.cuponsAguardandoDistribuicao)}</strong>
          </div>
        </div>
        {loading ? <Notice message="Carregando listagem global..." /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Número da sorte</th>
              <th>Cupom</th>
              <th>Aluno</th>
              <th>Conquistado em</th>
              <th>Validado em</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {luckyCouponRows.map((row) => (
              <tr key={row.id}>
                <td>{row.temNumeroSorte ? `#${formatNumber(row.numeroSorte)}` : "-"}</td>
                <td>#{formatNumber(row.numero)}</td>
                <td>
                  <strong>{row.aluno ? row.aluno.name : "Aluno não informado"}</strong>
                  <div className="muted">{row.aluno ? row.aluno.email : "-"}</div>
                </td>
                <td>{row.conquistadoEm ? formatDate(row.conquistadoEm) : "-"}</td>
                <td>{row.validadoEm ? formatDate(row.validadoEm) : "-"}</td>
                <td>
                  <span className={`badge ${row.temNumeroSorte ? "ok" : "warn"}`}>
                    {row.temNumeroSorte ? "Distribuído" : "Aguardando distribuição"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls label="Paginação da listagem global de cupons" onPageChange={goToLuckyCouponPage} pagination={luckyCouponPagination} />
        {!loading && luckyCouponRows.length === 0 ? <Notice message="Nenhum cupom validado encontrado para o filtro informado." /> : null}
      </section>
    </div>
  );
}

function AdminTurmasView({ apiClient }) {
  const [turmas, setTurmas] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "" });
  const [pagination, setPagination] = useState(getPagination());
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  function buildTurmasPath(nextFilters = filters, nextPage = pagination.page || 1) {
    return buildListPath("/turmas", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
    });
  }

  async function loadTurmas(nextFilters = filters, nextPage = pagination.page || 1) {
    setError("");
    setLoading(true);
    try {
      const result = await apiClient.request({ method: "GET", path: buildTurmasPath(nextFilters, nextPage) });
      setTurmas(getArray(result, "turmas"));
      setPagination(getPagination(result));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTurmas();
  }, [apiClient]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    await loadTurmas(filters, 1);
  }

  async function goToPage(page) {
    await loadTurmas(filters, page);
  }

  async function createTurma(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFeedback("");
    setError("");
    setCreating(true);
    try {
      await apiClient.request(
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
      form.reset();
      setFeedback("Turma cadastrada com sucesso.");
      await loadTurmas(filters, 1);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  async function updateTurma(event) {
    event.preventDefault();
    if (!editing) return;
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "PATCH", path: `/turmas/${editing.id}` },
        {
          body: {
            name: data.get("editName"),
            code: data.get("editCode"),
            description: data.get("editDescription"),
            startDate: data.get("editStartDate") || undefined,
            endDate: data.get("editEndDate") || undefined,
            status: data.get("editStatus"),
          },
        }
      );
      setEditing(null);
      setFeedback("Turma atualizada com sucesso.");
      await loadTurmas();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function deleteTurma(turma) {
    if (typeof window !== "undefined" && !window.confirm(`Excluir a turma ${turma.name}?`)) return;

    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "DELETE", path: `/turmas/${turma.id}` });
      if (editing && editing.id === turma.id) setEditing(null);
      setFeedback("Turma encerrada com sucesso.");
      await loadTurmas();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Turmas</h2>
            <p className="muted">Cadastre, edite, filtre e exclua turmas da mentoria.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar turmas" onClick={() => loadTurmas()} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={createTurma}>
          <label className="field">
            <span>Nome da turma</span>
            <input name="name" maxLength={120} required placeholder={`Turma ${todaySuffix()}`} />
          </label>
          <label className="field">
            <span>Código</span>
            <input name="code" maxLength={80} placeholder="M2-2026" />
          </label>
          <label className="field">
            <span>Início</span>
            <input name="startDate" min="2026-01-01" type="date" />
          </label>
          <label className="field">
            <span>Descrição</span>
            <input name="description" maxLength={4000} placeholder="Mentoria 2.0" />
          </label>
          <IconButton className="button" disabled={creating} icon="add_business" label="Cadastrar turma" type="submit" />
        </form>
      </section>

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Editar turma</h2>
            <IconButton className="button ghost" icon="close" label="Cancelar edição" onClick={() => setEditing(null)} />
          </div>
          <form className="form-grid" key={editing.id} onSubmit={updateTurma}>
            <label className="field">
              <span>Nome da turma</span>
              <input name="editName" maxLength={120} required defaultValue={editing.name} />
            </label>
            <label className="field">
              <span>Código</span>
              <input name="editCode" maxLength={80} defaultValue={editing.code || ""} />
            </label>
            <label className="field">
              <span>Início</span>
              <input name="editStartDate" min="2026-01-01" type="date" defaultValue={formatDateInputValue(editing.startDate || editing.data_inicio)} />
            </label>
            <label className="field">
              <span>Fim</span>
              <input name="editEndDate" min="2026-01-01" type="date" defaultValue={formatDateInputValue(editing.endDate || editing.data_fim)} />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="editStatus" defaultValue={editing.status || "ativa"}>
                <option value="ativa">ativa</option>
                <option value="encerrada">encerrada</option>
              </select>
            </label>
            <label className="field span-2">
              <span>Descrição</span>
              <textarea maxLength={4000} name="editDescription" defaultValue={editing.description || ""} />
            </label>
            <IconButton className="button" icon="save" label="Salvar turma" type="submit" />
          </form>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Listagem de turmas</h2>
            <p className="muted">Filtre por nome da turma e navegue pelos registros.</p>
          </div>
        </div>
        <form className="toolbar" onSubmit={applyFilters}>
          <label className="field">
            <span>Filtrar por nome da turma</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Digite parte do nome" />
          </label>
          <IconButton icon="filter_alt" label="Filtrar turmas" type="submit" />
        </form>

        {loading ? <Notice message="Carregando turmas..." /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Status</th>
              <th>Alunos</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {turmas.map((turma) => (
              <tr key={turma.id}>
                <td>{turma.name}</td>
                <td>{turma.code || "-"}</td>
                <td>{formatDate(turma.startDate || turma.data_inicio)}</td>
                <td>{formatDate(turma.endDate || turma.data_fim)}</td>
                <td>{formatStatus(turma.status)}</td>
                <td>{formatNumber(turma.quantidadeAlunos)}</td>
                <td>
                  <div className="actions table-actions">
                    <IconButton icon="edit" label={`Editar ${turma.name}`} onClick={() => setEditing(turma)} />
                    <IconButton className="button ghost" icon="delete" label={`Excluir ${turma.name}`} onClick={() => deleteTurma(turma)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls label="Paginação de turmas" onPageChange={goToPage} pagination={pagination} />
        {!loading && turmas.length === 0 ? <Notice message="Nenhuma turma encontrada para o filtro informado." /> : null}
      </section>
    </div>
  );
}

function AdminPilaresView({ apiClient }) {
  const [pilares, setPilares] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "" });
  const [pagination, setPagination] = useState(getPagination());
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  function buildPilaresPath(nextFilters = filters, nextPage = pagination.page || 1) {
    return buildListPath("/pilares", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      status: "todos",
      search: nextFilters.search,
    });
  }

  async function load(nextFilters = filters, nextPage = pagination.page || 1) {
    setError("");
    setLoading(true);
    try {
      const result = await apiClient.request({ method: "GET", path: buildPilaresPath(nextFilters, nextPage) });
      setPilares(getArray(result, "pilares"));
      setPagination(getPagination(result));
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
    await load(filters, 1);
  }

  async function goToPage(page) {
    await load(filters, page);
  }

  async function createPilar(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFeedback("");
    setError("");
    setCreating(true);
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
      form.reset();
      setFeedback("Pilar cadastrado com sucesso.");
      await load(filters, 1);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreating(false);
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
        setFeedback("Pilar inativado com sucesso.");
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
          <IconButton icon="refresh" label="Atualizar pilares" onClick={() => load()} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={createPilar}>
          <label className="field">
            <span>Nome</span>
            <input name="name" maxLength={120} required placeholder="Novo pilar" />
          </label>
          <label className="field">
            <span>Descrição</span>
            <input name="description" maxLength={4000} placeholder="Resumo do pilar" />
          </label>
          <IconButton className="button" disabled={creating} icon="add_circle" label="Cadastrar pilar" type="submit" />
        </form>
      </section>

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Editar pilar</h2>
            <IconButton className="button ghost" icon="close" label="Cancelar edição" onClick={() => setEditing(null)} />
          </div>
          <form className="form-grid" onSubmit={updatePilar}>
            <label className="field">
              <span>Nome</span>
              <input name="editName" maxLength={120} required defaultValue={editing.name} />
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
              <textarea maxLength={4000} name="editDescription" defaultValue={editing.description || ""} />
            </label>
            <IconButton className="button" icon="save" label="Salvar pilar" type="submit" />
          </form>
        </section>
      ) : null}

      <section className="panel">
        <h2>Pilares cadastrados</h2>
        <form className="toolbar" onSubmit={applyFilters}>
          <label className="field">
            <span>Filtrar por nome do pilar</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Digite parte do nome" />
          </label>
          <IconButton icon="filter_alt" label="Filtrar pilares" type="submit" />
        </form>
        {loading ? <Notice message="Carregando pilares..." /> : null}
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
                <td>{formatStatus(pilar.status)}</td>
                <td>{pilar.isDefault ? "padrão" : "manual"}</td>
                <td>
                  <div className="actions table-actions">
                    <IconButton icon="edit" label={`Editar ${pilar.name}`} onClick={() => setEditing(pilar)} />
                    <IconButton
                      className="button ghost"
                      icon={pilar.status === "ativo" ? "delete" : "toggle_on"}
                      label={pilar.status === "ativo" ? `Excluir ${pilar.name}` : `Ativar ${pilar.name}`}
                      onClick={() => togglePilar(pilar)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls label="Paginação de pilares" onPageChange={goToPage} pagination={pagination} />
        {!loading && pilares.length === 0 ? <Notice message="Nenhum pilar encontrado para o filtro informado." /> : null}
      </section>
    </div>
  );
}

function AdminDesafiosView({ apiClient }) {
  const [pilares, setPilares] = useState([]);
  const [desafios, setDesafios] = useState([]);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ search: "" });
  const [pagination, setPagination] = useState(getPagination());
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createChallengeType, setCreateChallengeType] = useState("standard");
  const [createQuizQuestions, setCreateQuizQuestions] = useState([createEmptyQuizQuestion()]);
  const [editChallengeType, setEditChallengeType] = useState("standard");
  const [editQuizQuestions, setEditQuizQuestions] = useState([createEmptyQuizQuestion()]);

  function buildDesafiosPath(nextFilters = filters, nextPage = pagination.page || 1) {
    return buildListPath("/desafios", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
    });
  }

  async function load(nextFilters = filters, nextPage = pagination.page || 1) {
    setError("");
    setLoading(true);
    try {
      const [pilaresResult, desafiosResult] = await Promise.all([
        apiClient.request({ method: "GET", path: "/pilares?limit=100&status=ativo" }),
        apiClient.request({ method: "GET", path: buildDesafiosPath(nextFilters, nextPage) }),
      ]);
      setPilares(getArray(pilaresResult, "pilares"));
      setDesafios(getArray(desafiosResult, "desafios"));
      setPagination(getPagination(desafiosResult));
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
    await load(filters, 1);
  }

  async function goToPage(page) {
    await load(filters, page);
  }

  async function createDesafio(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFeedback("");
    setError("");
    setCreating(true);
    try {
      const body = {
        pilares: buildPilaresPayloadFromForm(data),
        title: data.get("title"),
        description: data.get("description"),
        deliveryDate: data.get("deliveryDate") || undefined,
        challengeType: createChallengeType,
        status: data.get("status"),
      };
      if (createChallengeType === "quiz") {
        validateQuizQuestions(createQuizQuestions);
        body.questions = createQuizQuestions.map((question) => ({
          prompt: question.prompt,
          alternatives: question.alternatives,
          correctAlternative: Number(question.correctAlternative),
        }));
        body.finalContentUrl = data.get("finalContentUrl");
      } else {
        const maxParticipantes = Number(data.get("maxParticipantes"));
        body.livePresentationPoints = Number(data.get("livePresentationPoints") || 0);
        body.certificatePosted = data.get("certificatePosted") === "on";
        body.type = maxParticipantes > 1 ? "grupo" : "individual";
        body.maxParticipantes = maxParticipantes;
      }
      await apiClient.request(
        { method: "POST", path: "/desafios" },
        { body }
      );
      form.reset();
      setCreateChallengeType("standard");
      setCreateQuizQuestions([createEmptyQuizQuestion()]);
      setFeedback("Desafio cadastrado com sucesso.");
      await load(filters, 1);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreating(false);
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
    setFeedback("");
    setError("");
    try {
      const body = {
        pilares: buildPilaresPayloadFromForm(data, "edit"),
        title: data.get("editTitle"),
        description: data.get("editDescription"),
        deliveryDate: data.get("editDeliveryDate") || null,
        challengeType: editChallengeType,
        status: data.get("editStatus"),
      };
      if (editChallengeType === "quiz") {
        validateQuizQuestions(editQuizQuestions);
        body.questions = editQuizQuestions.map((question) => ({
          id: question.id || undefined,
          prompt: question.prompt,
          alternatives: question.alternatives,
          correctAlternative: Number(question.correctAlternative),
        }));
        body.finalContentUrl = data.get("editFinalContentUrl");
      } else {
        const maxParticipantes = Number(data.get("editMaxParticipantes"));
        body.livePresentationPoints = Number(data.get("editLivePresentationPoints") || 0);
        body.certificatePosted = data.get("editCertificatePosted") === "on";
        body.type = maxParticipantes > 1 ? "grupo" : "individual";
        body.maxParticipantes = maxParticipantes;
      }
      await apiClient.request(
        { method: "PATCH", path: `/desafios/${editing.id}` },
        { body }
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
      const result = await apiClient.request({ method: "DELETE", path: `/desafios/${desafio.id}` });
      setFeedback(result && result.desafio && result.desafio.status === "inativo" ? "Desafio inativado para preservar o histórico." : "Desafio apagado.");
      if (editing && editing.id === desafio.id) setEditing(null);
      await load();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  function beginEditing(desafio) {
    setEditing(desafio);
    setEditChallengeType(isQuizChallenge(desafio) ? "quiz" : "standard");
    setEditQuizQuestions(normalizeQuizQuestionsForForm(desafio));
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Desafios</h2>
            <p className="muted">Cadastre desafios e ative quando estiverem prontos para alunos.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar desafios" onClick={() => load()} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={createDesafio}>
          <label className="field">
            <span>Título</span>
            <input name="title" maxLength={160} required placeholder={`Desafio ${todaySuffix()}`} />
          </label>
          <label className="field">
            <span>Tipo de desafio</span>
            <select value={createChallengeType} onChange={(event) => setCreateChallengeType(event.target.value)}>
              <option value="standard">Tradicional</option>
              <option value="quiz">Perguntas e respostas</option>
            </select>
          </label>
          <div className="field span-2">
            <span>Pilares e pontuação</span>
            <small className="muted">Pilares desmarcados ficam com 0. Marque um pilar somente quando ele tiver pontuação maior que zero.</small>
            <div className="pillar-points-grid">
              {pilares.map((pilar) => (
                <div className="pillar-point-row" key={pilar.id}>
                  <label className="checkbox-field">
                    <input name="PilarIds" type="checkbox" value={pilar.id} />
                    {pilar.name}
                  </label>
                  <input aria-label={`Pontos para ${pilar.name}`} name={`PilarPoints_${pilar.id}`} type="number" min="0" max="1000000" defaultValue="0" />
                </div>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Data limite de entrega</span>
            <input name="deliveryDate" required type="date" min="2026-01-01" />
          </label>
          <label className="field">
            <span>Status</span>
            <select name="status" defaultValue="inativo">
              <option value="inativo">inativo</option>
              <option value="ativo">ativo</option>
            </select>
          </label>
          {createChallengeType === "standard" ? (
            <>
              <label className="field">
                <span>Pontos apresentação ao vivo (use 0 se não houver apresentação)</span>
                <input name="livePresentationPoints" required type="number" min="0" max="1000000" defaultValue="0" />
              </label>
              <label className="field">
                <span>Participantes por grupo</span>
                <input name="maxParticipantes" required type="number" min="1" max="5" defaultValue="5" />
              </label>
              <label className="checkbox-field span-2">
                <input name="certificatePosted" type="checkbox" />
                <span>Certificado postado</span>
              </label>
            </>
          ) : (
            <>
              <div className="span-2 status-item">
                <strong>Questionário individual</strong>
                <span className="muted">O aluno responderá uma pergunta por vez e só avançará após acertar.</span>
              </div>
              <label className="field span-2">
                <span>Link do conteúdo final</span>
                <input name="finalContentUrl" required type="url" placeholder="https://..." />
                <small className="muted">Será liberado ao aluno somente depois que ele concluir o questionário.</small>
              </label>
              <div className="field span-2">
                <span>Perguntas e respostas</span>
                <small className="muted">Cadastre cinco alternativas por pergunta e marque exatamente uma como correta.</small>
                <QuizQuestionEditor questions={createQuizQuestions} setQuestions={setCreateQuizQuestions} />
              </div>
            </>
          )}
          <label className="field span-2">
            <span>Descrição</span>
            <textarea maxLength={4000} name="description" required placeholder="Descreva o que o aluno deve executar ou aprender." />
          </label>
          <IconButton className="button" disabled={creating} icon="add_task" label="Cadastrar desafio" type="submit" />
        </form>
      </section>

      {editing ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Editar desafio</h2>
              <p className="muted">Atualize dados, pontuação, pilar, entrega e status.</p>
            </div>
            <IconButton className="button ghost" icon="close" label="Cancelar edição" onClick={() => setEditing(null)} />
          </div>
          <form className="form-grid" key={editing.id} onSubmit={updateDesafio}>
            <label className="field">
              <span>Título</span>
              <input name="editTitle" maxLength={160} required defaultValue={editing.title} />
            </label>
            <label className="field">
              <span>Tipo de desafio</span>
              <select value={editChallengeType} onChange={(event) => setEditChallengeType(event.target.value)}>
                <option value="standard">Tradicional</option>
                <option value="quiz">Perguntas e respostas</option>
              </select>
            </label>
            <div className="field span-2">
              <span>Pilares e pontuação</span>
              <small className="muted">Pilares desmarcados ficam com 0. Marque um pilar somente quando ele tiver pontuação maior que zero.</small>
              <div className="pillar-points-grid">
                {pilares.map((pilar) => (
                  <div className="pillar-point-row" key={pilar.id}>
                    <label className="checkbox-field">
                      <input name="editPilarIds" type="checkbox" value={pilar.id} defaultChecked={isPilarSelected(editing, pilar.id)} />
                      {pilar.name}
                    </label>
                    <input
                      aria-label={`Pontos para ${pilar.name}`}
                      name={`editPilarPoints_${pilar.id}`}
                      type="number"
                      min="0"
                      max="1000000"
                      defaultValue={getPilarPointValue(editing, pilar.id, 0)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <label className="field">
              <span>Data limite de entrega</span>
              <input name="editDeliveryDate" required type="date" min="2026-01-01" defaultValue={formatDateInputValue(editing.deliveryDate || editing.dataEntrega)} />
            </label>
            <label className="field">
              <span>Status</span>
              <select name="editStatus" defaultValue={editing.status || "inativo"}>
                <option value="inativo">inativo</option>
                <option value="ativo">ativo</option>
              </select>
            </label>
            {editChallengeType === "standard" ? (
              <>
                <label className="field">
                  <span>Pontos apresentação ao vivo (use 0 se não houver apresentação)</span>
                  <input
                    name="editLivePresentationPoints"
                    required
                    type="number"
                    min="0"
                    max="1000000"
                    defaultValue={editing.livePresentationPoints || editing.pontosApresentacaoAoVivo || 0}
                  />
                </label>
                <label className="field">
                  <span>Participantes por grupo</span>
                  <input name="editMaxParticipantes" required type="number" min="1" max="5" defaultValue={editing.maxParticipantes || 1} />
                </label>
                <label className="checkbox-field span-2">
                  <input name="editCertificatePosted" type="checkbox" defaultChecked={editing.certificatePosted === true || editing.certificadoPostado === true} />
                  <span>Certificado postado</span>
                </label>
              </>
            ) : (
              <>
                <div className="span-2 status-item">
                  <strong>Questionário individual</strong>
                  <span className="muted">O aluno só avançará após acertar cada pergunta.</span>
                </div>
                <label className="field span-2">
                  <span>Link do conteúdo final</span>
                  <input name="editFinalContentUrl" required type="url" defaultValue={getQuizFinalContentUrl(editing)} placeholder="https://..." />
                </label>
                <div className="field span-2">
                  <span>Perguntas e respostas</span>
                  <small className="muted">Cadastre cinco alternativas por pergunta e marque exatamente uma como correta.</small>
                  <QuizQuestionEditor questions={editQuizQuestions} setQuestions={setEditQuizQuestions} />
                </div>
              </>
            )}
            <label className="field span-2">
              <span>Descrição</span>
              <textarea maxLength={4000} name="editDescription" required defaultValue={editing.description || ""} />
            </label>
            <IconButton className="button" icon="save" label="Salvar desafio" type="submit" />
          </form>
        </section>
      ) : null}

      <section className="panel">
        <h2>Desafios cadastrados</h2>
        <form className="toolbar" onSubmit={applyFilters}>
          <label className="field">
            <span>Filtrar por título</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Digite parte do título" />
          </label>
          <IconButton icon="filter_alt" label="Filtrar desafios" type="submit" />
        </form>
        {loading ? <Notice message="Carregando desafios..." /> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Tipo</th>
              <th>Pilares</th>
              <th>Pontos</th>
              <th>Apresentação</th>
              <th>Certificado</th>
              <th>Entrega até</th>
              <th>Participantes</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {desafios.map((desafio) => (
              <tr key={desafio.id}>
                <td>{desafio.title}</td>
                <td>{isQuizChallenge(desafio) ? "Perguntas e respostas" : "Tradicional"}</td>
                <td>{formatPilarPoints(desafio)}</td>
                <td>{desafio.points}</td>
                <td>{formatNumber(desafio.livePresentationPoints || desafio.pontosApresentacaoAoVivo)}</td>
                <td>
                  <span className={`badge ${desafio.certificatePosted || desafio.certificadoPostado ? "ok" : "off"}`}>
                    {desafio.certificatePosted || desafio.certificadoPostado ? "Sim" : "Não"}
                  </span>
                </td>
                <td>{formatDate(desafio.deliveryDate || desafio.dataEntrega)}</td>
                <td>{desafio.maxParticipantes}</td>
                <td>{formatStatus(desafio.status)}</td>
                <td>
                  <div className="actions table-actions">
                    <IconButton icon="edit" label={`Editar ${desafio.title}`} onClick={() => beginEditing(desafio)} />
                    <IconButton className="button ghost" icon="delete" label={`Apagar ${desafio.title}`} onClick={() => deleteDesafio(desafio)} />
                    <IconButton
                      icon={desafio.status === "ativo" ? "toggle_off" : "toggle_on"}
                      label={desafio.status === "ativo" ? `Desativar ${desafio.title}` : `Ativar ${desafio.title}`}
                      onClick={() => toggleDesafioStatus(desafio)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationControls label="Paginação de desafios" onPageChange={goToPage} pagination={pagination} />
        {!loading && desafios.length === 0 ? <Notice message="Nenhum desafio encontrado para o filtro informado." /> : null}
      </section>
    </div>
  );
}

function AdminApprovalsView({ apiClient }) {
  const [envios, setEnvios] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentOptionsOpen, setStudentOptionsOpen] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [pilares, setPilares] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "pendente" });
  const [pagination, setPagination] = useState(getPagination());
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [evaluatingId, setEvaluatingId] = useState("");
  const [extraPoints, setExtraPoints] = useState([]);
  const [editingExtra, setEditingExtra] = useState(null);
  const [creatingExtra, setCreatingExtra] = useState(false);
  const [updatingExtra, setUpdatingExtra] = useState(false);

  function buildApprovalsPath(nextFilters = filters, nextPage = pagination.page || 1) {
    return buildListPath("/envios-desafios/aprovacoes", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      sort: "desc",
      status: nextFilters.status,
      search: nextFilters.search,
    });
  }

  async function load(nextFilters = filters, nextPage = pagination.page || 1) {
    setError("");
    setLoading(true);
    try {
      const [result, studentsResult, pilaresResult, extraPointsResult] = await Promise.all([
        apiClient.request({ method: "GET", path: buildApprovalsPath(nextFilters, nextPage) }),
        apiClient.request({ method: "GET", path: "/alunos?limit=100" }),
        apiClient.request({ method: "GET", path: "/pilares?limit=100&status=ativo" }),
        apiClient.request({ method: "GET", path: "/pontuacoes/extras?limit=100" }),
      ]);
      setEnvios(getArray(result, "envios"));
      setPagination(getPagination(result));
      setStudents(getArray(studentsResult, "alunos"));
      setPilares(getArray(pilaresResult, "pilares"));
      setExtraPoints(getArray(extraPointsResult, "pontosExtras").length > 0 ? getArray(extraPointsResult, "pontosExtras") : getArray(extraPointsResult, "pontuacoes"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadStudentOptions(search = studentSearch) {
    setStudentsLoading(true);
    try {
      const result = await apiClient.request({
        method: "GET",
        path: buildListPath("/alunos", {
          limit: 100,
          page: 1,
          search,
        }),
      });
      setStudents(getArray(result, "alunos"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setStudentsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadStudentOptions(studentSearch);
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [apiClient, studentSearch]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyFilters(event) {
    event.preventDefault();
    await load(filters, 1);
  }

  async function goToPage(page) {
    await load(filters, page);
  }

  async function evaluateEnvio(event, envio) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const decision = event.nativeEvent.submitter ? event.nativeEvent.submitter.value : "aprovado";
    setFeedback("");
    setError("");
    setEvaluatingId(envio.id);
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
    } finally {
      setEvaluatingId("");
    }
  }

  async function createExtraPoints(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const alunoId = selectedStudent ? selectedStudent.id : data.get("extraAlunoId");
    setFeedback("");
    setError("");

    if (!alunoId) {
      setError("Selecione um aluno na lista para lançar pontos extras.");
      return;
    }

    setCreatingExtra(true);
    try {
      await apiClient.request(
        { method: "POST", path: "/pontuacoes/extras" },
        {
          body: {
            alunoId,
            pilarId: data.get("extraPilarId"),
            pontos: Number(data.get("extraPontos") || 0),
            motivo: data.get("extraMotivo") || undefined,
          },
        }
      );
      form.reset();
      setSelectedStudent(null);
      setStudentSearch("");
      setStudentOptionsOpen(false);
      setFeedback("Pontuação extra cadastrada para o aluno.");
      await load();
    } catch (extraPointsError) {
      setError(getErrorMessage(extraPointsError));
    } finally {
      setCreatingExtra(false);
    }
  }

  async function updateExtraPoint(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setUpdatingExtra(true);
    setFeedback("");
    setError("");
    try {
      await apiClient.request(
        { method: "PATCH", path: `/pontuacoes/extras/${editingExtra.id}` },
        {
          body: {
            pilarId: data.get("editExtraPilarId"),
            pontos: Number(data.get("editExtraPontos") || 0),
            motivo: data.get("editExtraMotivo") || undefined,
          },
        }
      );
      setEditingExtra(null);
      setFeedback("Pontuação extra atualizada.");
      await load();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    } finally {
      setUpdatingExtra(false);
    }
  }

  function updateStudentSearch(value) {
    setStudentSearch(value);
    if (!selectedStudent || value !== `${selectedStudent.name} - ${selectedStudent.email}`) {
      setSelectedStudent(null);
    }
    setStudentOptionsOpen(true);
  }

  function selectExtraStudent(student) {
    setSelectedStudent(student);
    setStudentSearch(`${student.name} - ${student.email}`);
    setStudentOptionsOpen(false);
  }

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Aprovações</h2>
            <p className="muted">Revise envios, filtre por nome ou título e consulte aprovados quando necessário.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar aprovações" onClick={() => load()} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <form className="form-grid" onSubmit={applyFilters}>
          <label className="field">
            <span>Filtrar por nome ou título</span>
            <input value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} placeholder="Aluno, participante ou desafio" />
          </label>
          <label className="field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
              <option value="pendente">Pendentes</option>
              <option value="aprovado">Aprovados</option>
              <option value="reprovado">Reprovados</option>
              <option value="ajuste">Ajuste solicitado</option>
              <option value="todos">Todos</option>
            </select>
          </label>
          <IconButton icon="filter_alt" label="Filtrar aprovações" type="submit" />
        </form>
        <div className="stack-list">
          <h3>Histórico de pontos extras</h3>
          {extraPoints.length === 0 ? <Notice message="Nenhum ponto extra cadastrado." /> : null}
          {extraPoints.map((item) => (
            <div className="status-item" key={item.id}>
              <strong>{item.aluno ? item.aluno.name : "Aluno não informado"} · {formatNumber(item.pontos)} pontos</strong>
              <span className="muted">{item.pilar ? item.pilar.name : "Pilar não informado"} · {item.motivo || "Sem motivo informado"}</span>
              <div className="actions">
                <IconButton icon="edit" label={`Editar pontuação extra de ${item.aluno ? item.aluno.name : "aluno"}`} onClick={() => setEditingExtra(item)} />
              </div>
            </div>
          ))}
        </div>
        {editingExtra ? (
          <form className="form-grid" onSubmit={updateExtraPoint}>
            <div className="field span-2">
              <span>Editando pontos de {editingExtra.aluno ? editingExtra.aluno.name : "aluno"}</span>
            </div>
            <label className="field">
              <span>Pilar</span>
              <select name="editExtraPilarId" required defaultValue={editingExtra.pilar ? editingExtra.pilar.id : ""}>
                {pilares.map((pilar) => <option key={pilar.id} value={pilar.id}>{pilar.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Pontos</span>
              <input name="editExtraPontos" required min="1" max="1000000" type="number" defaultValue={editingExtra.pontos} />
            </label>
            <label className="field span-2">
              <span>Motivo</span>
              <input name="editExtraMotivo" defaultValue={editingExtra.motivo || ""} />
            </label>
            <div className="actions span-2">
              <IconButton className="button" disabled={updatingExtra} icon="save" label="Salvar pontuação extra" type="submit" />
              <IconButton className="button ghost" disabled={updatingExtra} icon="close" label="Cancelar edição da pontuação extra" onClick={() => setEditingExtra(null)} />
            </div>
          </form>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Pontos extras</h2>
            <p className="muted">Lance pontos manuais para um aluno em um pilar do método.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={createExtraPoints}>
          <label className="field autocomplete-field">
            <span>Aluno</span>
            <input
              autoComplete="off"
              onBlur={() => window.setTimeout(() => setStudentOptionsOpen(false), 150)}
              onChange={(event) => updateStudentSearch(event.target.value)}
              onFocus={() => {
                setStudentOptionsOpen(true);
                if (students.length === 0) loadStudentOptions("");
              }}
              placeholder="Digite nome ou e-mail"
              role="combobox"
              value={studentSearch}
            />
            <input name="extraAlunoId" readOnly type="hidden" value={selectedStudent ? selectedStudent.id : ""} />
            {studentOptionsOpen ? (
              <div className="autocomplete-options">
                {studentsLoading ? <span className="autocomplete-empty">Buscando alunos...</span> : null}
                {!studentsLoading && students.length === 0 ? <span className="autocomplete-empty">Nenhum aluno encontrado</span> : null}
                {!studentsLoading
                  ? students.map((student) => (
                      <button key={student.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectExtraStudent(student)} type="button">
                        <strong>{student.name}</strong>
                        <span>{student.email}</span>
                      </button>
                    ))
                  : null}
              </div>
            ) : null}
          </label>
          <label className="field">
            <span>Pilar</span>
            <select name="extraPilarId" required defaultValue="">
              <option value="" disabled>
                Selecione um pilar
              </option>
              {pilares.map((pilar) => (
                <option key={pilar.id} value={pilar.id}>
                  {pilar.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Pontos</span>
            <input name="extraPontos" required min="1" step="1" type="number" placeholder="10" />
          </label>
          <label className="field">
            <span>Motivo</span>
            <input maxLength={255} name="extraMotivo" placeholder="Ex.: participação, mentoria, contribuição" />
          </label>
          <IconButton
            className="button"
            disabled={creatingExtra}
            icon="add_circle"
            label={creatingExtra ? "Cadastrando pontos extras" : "Cadastrar pontos extras"}
            type="submit"
          />
        </form>
      </section>

      {loading ? <Notice message="Carregando aprovações..." /> : null}
      {!loading && envios.length === 0 ? <Notice message="Nenhum envio encontrado para o filtro informado." /> : null}
      {envios.map((envio) => (
        <section className="panel" key={envio.id}>
          <div className="panel-header">
            <div>
              <h2>{envio.desafio ? envio.desafio.title : "Envio de desafio"}</h2>
              <p className="muted">
                Responsável: {envio.aluno ? envio.aluno.name : "Aluno não informado"} · Turma: {formatTurmaName(envio.turma)}
              </p>
            </div>
                <span className="badge warn">{formatStatus(envio.status)}</span>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <span className="muted">Descrição enviada</span>
              <strong>{envio.description}</strong>
            </div>
            <div className="status-item">
              <span className="muted">Pontuação</span>
              <strong>{formatNumber(envio.desafio && envio.desafio.points)} pontos do desafio</strong>
              <span className="muted">{envio.desafio ? formatPilarPoints(envio.desafio) : "-"}</span>
              <span className="muted">
                +{formatNumber(envio.desafio && envio.desafio.livePresentationPoints)} apresentação somente se marcar o checkbox ao aprovar
              </span>
            </div>
            <div className="status-item">
              <span className="muted">Participantes</span>
              <strong>
                {getSubmissionParticipantNames(envio).length > 0
                  ? getSubmissionParticipantNames(envio).join(", ")
                  : "Participantes não informados"}
              </strong>
            </div>
            <div className="status-item">
              <span className="muted">Evidências</span>
              <LinkList emptyMessage="Sem evidência" items={envio && envio.evidencias} />
            </div>
            <div className="status-item span-2">
              <span className="muted">Anexos</span>
              <LinkList download items={envio && envio.anexos} />
            </div>
          </div>
          {envio.status === "pendente" ? (
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
                <button className="button with-icon" disabled={evaluatingId === envio.id} type="submit" name="decision" value="aprovado">
                  <ButtonIcon name="check_circle" />
                  Aprovar
                </button>
                <button className="button secondary with-icon" disabled={evaluatingId === envio.id} type="submit" name="decision" value="reprovado">
                  <ButtonIcon name="cancel" />
                  Reprovar
                </button>
              </div>
            </form>
          ) : (
            <Notice
              message={envio.feedback ? `Feedback registrado: ${envio.feedback}` : "Envio já avaliado. Use o filtro de status para consultar outros registros."}
              type={envio.status === "reprovado" || envio.status === "ajuste" ? "error" : undefined}
            />
          )}
        </section>
      ))}
      <PaginationControls label="Paginação de aprovações" onPageChange={goToPage} pagination={pagination} />
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
          <IconButton icon="refresh" label="Atualizar ranking" onClick={load} />
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

function AdminReportsView({ apiClient }) {
  const [activeReport, setActiveReport] = useState("studentPillars");
  const [pointRows, setPointRows] = useState([]);
  const [pointFilters, setPointFilters] = useState({ search: "" });
  const [pointPagination, setPointPagination] = useState(getPagination());
  const [pointError, setPointError] = useState("");
  const [pointLoading, setPointLoading] = useState(true);
  const [groupRows, setGroupRows] = useState([]);
  const [groupFilters, setGroupFilters] = useState({ search: "" });
  const [groupPagination, setGroupPagination] = useState(getPagination());
  const [groupSummary, setGroupSummary] = useState({});
  const [groupError, setGroupError] = useState("");
  const [groupLoading, setGroupLoading] = useState(true);
  const [luckyRows, setLuckyRows] = useState([]);
  const [luckyFilters, setLuckyFilters] = useState({ search: "" });
  const [luckyPagination, setLuckyPagination] = useState(getPagination());
  const [luckyError, setLuckyError] = useState("");
  const [luckyLoading, setLuckyLoading] = useState(true);

  function buildPointReportsPath(nextFilters = pointFilters, nextPage = pointPagination.page || 1) {
    return buildListPath("/relatorios/alunos/pilares", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
    });
  }

  function buildGroupReportsPath(nextFilters = groupFilters, nextPage = groupPagination.page || 1) {
    return buildListPath("/relatorios/grupos-desafios", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
    });
  }

  function buildLuckyReportsPath(nextFilters = luckyFilters, nextPage = luckyPagination.page || 1) {
    return buildListPath("/relatorios/cupons-sorte", {
      limit: LIST_PAGE_SIZE,
      page: nextPage,
      search: nextFilters.search,
    });
  }

  async function loadPointReport(nextFilters = pointFilters, nextPage = pointPagination.page || 1) {
    setPointError("");
    setPointLoading(true);
    try {
      const result = await apiClient.request({ method: "GET", path: buildPointReportsPath(nextFilters, nextPage) });
      setPointRows(getArray(result, "alunos").length > 0 ? getArray(result, "alunos") : getArray(result, "relatorio"));
      setPointPagination(getPagination(result));
    } catch (loadError) {
      setPointError(getErrorMessage(loadError));
    } finally {
      setPointLoading(false);
    }
  }

  async function loadGroupReport(nextFilters = groupFilters, nextPage = groupPagination.page || 1) {
    setGroupError("");
    setGroupLoading(true);
    try {
      const result = await apiClient.request({ method: "GET", path: buildGroupReportsPath(nextFilters, nextPage) });
      setGroupRows(getArray(result, "grupos").length > 0 ? getArray(result, "grupos") : getArray(result, "relatorio"));
      setGroupPagination(getPagination(result));
      setGroupSummary(result && result.resumo ? result.resumo : {});
    } catch (loadError) {
      setGroupError(getErrorMessage(loadError));
    } finally {
      setGroupLoading(false);
    }
  }

  async function loadLuckyReport(nextFilters = luckyFilters, nextPage = luckyPagination.page || 1) {
    setLuckyError("");
    setLuckyLoading(true);
    try {
      const result = await apiClient.request({ method: "GET", path: buildLuckyReportsPath(nextFilters, nextPage) });
      setLuckyRows(getArray(result, "alunos"));
      setLuckyPagination(getPagination(result));
    } catch (loadError) {
      setLuckyError(getErrorMessage(loadError));
    } finally {
      setLuckyLoading(false);
    }
  }

  useEffect(() => {
    loadPointReport();
    loadGroupReport();
    loadLuckyReport();
  }, [apiClient]);

  function updatePointFilter(field, value) {
    setPointFilters((current) => ({ ...current, [field]: value }));
  }

  function updateGroupFilter(field, value) {
    setGroupFilters((current) => ({ ...current, [field]: value }));
  }

  function updateLuckyFilter(field, value) {
    setLuckyFilters((current) => ({ ...current, [field]: value }));
  }

  async function applyPointFilters(event) {
    event.preventDefault();
    await loadPointReport(pointFilters, 1);
  }

  async function applyGroupFilters(event) {
    event.preventDefault();
    await loadGroupReport(groupFilters, 1);
  }

  async function applyLuckyFilters(event) {
    event.preventDefault();
    await loadLuckyReport(luckyFilters, 1);
  }

  async function goToPointPage(page) {
    await loadPointReport(pointFilters, page);
  }

  async function goToGroupPage(page) {
    await loadGroupReport(groupFilters, page);
  }

  async function goToLuckyPage(page) {
    await loadLuckyReport(luckyFilters, page);
  }

  async function refreshActiveReport() {
    if (activeReport === "challengeGroups") {
      await loadGroupReport();
      return;
    }

    if (activeReport === "luckyNumbers") {
      await loadLuckyReport();
      return;
    }

    await loadPointReport();
  }

  function formatReportOrigin(value) {
    return value === "ponto_extra" || value === "pontuacao_extra" ? "Ponto extra" : "Desafio";
  }

  function formatReportChallengeLabel(item) {
    const origin = formatReportOrigin(item && (item.tipo || item.origem || item.source));
    const title = item && item.desafio && item.desafio.title ? ` - ${item.desafio.title}` : "";
    return `${origin}${title}`;
  }

  function formatPillarBreakdown(row) {
    const details = getArray(row, "detalhesPontosPorPilar");
    const presentationDetails = getArray(row, "detalhesApresentacaoAoVivo");
    const bonusApresentacaoAoVivo = Number(row && row.bonusApresentacaoAoVivo) || 0;
    if (details.length > 0 || presentationDetails.length > 0 || bonusApresentacaoAoVivo > 0) {
      return (
        <div className="report-detail-list">
          {details.map((item, index) => {
            const pilar = item.pilar || {};
            const responsavel = item.responsavel || item.professor || {};

            return (
              <div className="report-detail-item" key={`${item.dataLancamento || "sem-data"}-${index}`}>
                <strong>
                  {formatDate(item.dataLancamento)} · {pilar.name || "Pilar não informado"}
                </strong>
                <span>
                  {formatReportChallengeLabel(item)} · {formatNumber(item.pontos)} pts
                </span>
                <span className="muted">Professor/admin: {responsavel.name || "Não informado"}</span>
              </div>
            );
          })}
          {presentationDetails.length > 0
            ? presentationDetails.map((item, index) => (
                <div className="report-detail-item" key={`apresentacao-${item.dataLancamento || "sem-data"}-${index}`}>
                  <strong>{formatDate(item.dataLancamento)} · Apresentação ao vivo</strong>
                  <span>
                    Apresentação ao vivo{item.desafio && item.desafio.title ? ` - ${item.desafio.title}` : ""} · Bônus de {formatNumber(item.pontos)} pt(s)
                  </span>
                </div>
              ))
            : bonusApresentacaoAoVivo > 0 ? (
                <div className="report-detail-item">
                  <strong>Apresentação ao vivo</strong>
                  <span>Bônus de {formatNumber(bonusApresentacaoAoVivo)} pt(s)</span>
                </div>
              ) : null}
        </div>
      );
    }

    const items = getArray(row, "pontosPorPilar");
    if (items.length === 0) return "Sem pontuação por pilar";

    return items
      .map((item) => {
        const pilar = item.pilar || {};
        return `${pilar.name || "Pilar não informado"}: ${formatNumber(item.pontos)} pts`;
      })
      .join(" | ");
  }

  function formatParticipantNames(row) {
    const participantes = getArray(row, "participantes").length > 0 ? getArray(row, "participantes") : getArray(row, "integrantes");
    if (participantes.length === 0) return "Sem integrantes";

    return participantes.map((participante) => participante.name || participante.email || "Aluno sem nome").join(", ");
  }

  function formatChecklistBreakdown(row) {
    const checklist = row && row.checklistPlanejamento ? row.checklistPlanejamento : {};
    const semanas = getArray(checklist, "semanas");

    if (semanas.length === 0) {
      return "Sem pontuação de planejamento";
    }

    return (
      <div className="report-detail-list">
        <div className="report-detail-item">
          <strong>{formatNumber(checklist.totalPontos)} pts no total</strong>
          <span>
            {formatNumber(checklist.tarefasConcluidas)} tarefa(s) concluída(s) · {formatNumber(checklist.diasConcluidos || checklist.diasComCheck)} dia(s) concluído(s)
          </span>
        </div>
        {semanas.map((semana, index) => (
          <div className="report-detail-item" key={`${semana.dataPlanejada || semana.inicio || "sem-inicio"}-${index}`}>
            <strong>{formatCalendarDate(`${semana.dataPlanejada || semana.inicio}T00:00:00`)}</strong>
            <span>
              {semana.concluidoNoDia && semana.dataConclusao
                ? `Concluído em ${formatCalendarDate(`${semana.dataConclusao}T00:00:00`)} com ${formatNumber(semana.pontos)} pt(s)`
                : `Ainda não concluído · ${formatNumber(semana.pontos)} pt(s)`}
            </span>
            <span className="muted">{formatNumber(semana.tarefasConcluidas)} de {formatNumber(semana.totalTarefas)} tarefa(s) concluída(s)</span>
          </div>
        ))}
      </div>
    );
  }

  function formatSubmissionStatus(status) {
    const normalized = String(status || "sem_envio").trim().toLowerCase();
    const labels = {
      sem_envio: "Sem envio",
      pendente: "Pendente",
      aprovado: "Aprovado",
      reprovado: "Reprovado",
      ajuste: "Ajuste solicitado",
      cancelado: "Cancelado",
    };

    return labels[normalized] || status || "Sem envio";
  }

  function getSubmissionBadgeClass(status) {
    const normalized = String(status || "sem_envio").trim().toLowerCase();
    if (normalized === "aprovado") return "ok";
    if (normalized === "pendente" || normalized === "ajuste") return "warn";
    return "off";
  }

  const currentError = activeReport === "challengeGroups" ? groupError : activeReport === "luckyNumbers" ? luckyError : pointError;

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Relatórios</h2>
            <p className="muted">Pontuação por aluno e acompanhamento dos grupos formados para os desafios.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar relatório" onClick={refreshActiveReport} />
        </div>

        <div className="report-switch" role="tablist" aria-label="Tipos de relatório">
          <button
            aria-selected={activeReport === "studentPillars"}
            className={`button secondary with-icon${activeReport === "studentPillars" ? " active" : ""}`}
            onClick={() => setActiveReport("studentPillars")}
            role="tab"
            type="button"
          >
            <ButtonIcon name="leaderboard" />
            Pontos por aluno
          </button>
          <button
            aria-selected={activeReport === "challengeGroups"}
            className={`button secondary with-icon${activeReport === "challengeGroups" ? " active" : ""}`}
            onClick={() => setActiveReport("challengeGroups")}
            role="tab"
            type="button"
          >
            <ButtonIcon name="groups_2" />
            Grupos dos desafios
          </button>
          <button
            aria-selected={activeReport === "luckyNumbers"}
            className={`button secondary with-icon${activeReport === "luckyNumbers" ? " active" : ""}`}
            onClick={() => setActiveReport("luckyNumbers")}
            role="tab"
            type="button"
          >
            <ButtonIcon name="confirmation_number" />
            Números da sorte
          </button>
        </div>

        <Notice message={currentError} type="error" />

        {activeReport === "studentPillars" ? (
          <>
            <form className="toolbar" onSubmit={applyPointFilters}>
              <label className="field">
                <span>Filtrar por aluno</span>
                <input
                  value={pointFilters.search}
                  onChange={(event) => updatePointFilter("search", event.target.value)}
                  placeholder="Nome ou e-mail do aluno"
                />
              </label>
              <IconButton icon="filter_alt" label="Filtrar relatório" type="submit" />
            </form>
            {pointLoading ? <Notice message="Carregando relatório..." /> : null}
            <table className="table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>E-mail</th>
                  <th>Total de pontos</th>
                  <th>Pontos por pilar e bônus</th>
                  <th>Checklist planejamento</th>
                </tr>
              </thead>
              <tbody>
                {pointRows.map((row) => (
                  <tr key={(row.aluno && row.aluno.id) || row.alunoId}>
                    <td>{row.aluno && row.aluno.name}</td>
                    <td>{row.aluno && row.aluno.email}</td>
                    <td>{formatNumber(row.totalPontos)}</td>
                    <td>{formatPillarBreakdown(row)}</td>
                    <td>{formatChecklistBreakdown(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls label="Paginação do relatório de pontos" onPageChange={goToPointPage} pagination={pointPagination} />
            {!pointLoading && pointRows.length === 0 ? <Notice message="Nenhum aluno encontrado para o filtro informado." /> : null}
          </>
        ) : activeReport === "challengeGroups" ? (
          <>
            <div className="metrics">
              <div className="metric">
                <span className="muted">Grupos</span>
                <strong>{formatNumber(groupSummary.totalGrupos)}</strong>
              </div>
              <div className="metric">
                <span className="muted">Formados</span>
                <strong>{formatNumber(groupSummary.gruposFormados)}</strong>
              </div>
              <div className="metric">
                <span className="muted">Enviados</span>
                <strong>{formatNumber(groupSummary.enviosRealizados)}</strong>
              </div>
            </div>
            <form className="toolbar" onSubmit={applyGroupFilters}>
              <label className="field">
                <span>Filtrar por desafio ou integrante</span>
                <input
                  value={groupFilters.search}
                  onChange={(event) => updateGroupFilter("search", event.target.value)}
                  placeholder="Título, aluno, turma, modalidade ou status"
                />
              </label>
              <IconButton icon="filter_alt" label="Filtrar grupos" type="submit" />
            </form>
            {groupLoading ? <Notice message="Carregando grupos dos desafios..." /> : null}
            <table className="table">
              <thead>
                <tr>
                  <th>Desafio</th>
                  <th>Integrantes</th>
                  <th>Modalidade</th>
                  <th>Grupo</th>
                  <th>Envio</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((row) => (
                  <tr key={row.id || `${row.tituloDesafio}-${row.createdAt}`}>
                    <td>
                      <strong>{row.tituloDesafio || (row.desafio && row.desafio.title) || "Desafio não informado"}</strong>
                      <div className="muted">{formatTurmaName(row.turma)}</div>
                    </td>
                    <td>{formatParticipantNames(row)}</td>
                    <td>
                      <span className={`badge ${row.modalidade === "ingles" ? "ok" : "off"}`}>
                        {row.modalidade === "ingles" ? "Inglês" : "Normal"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${row.grupoFormado ? "ok" : "warn"}`}>{row.grupoFormado ? "Formado" : "Em formação"}</span>
                      <div className="muted">
                        {formatNumber(row.totalParticipantes)} de {formatNumber(row.maxParticipantes)} integrantes
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${row.enviadoParaAprovacao ? "ok" : "off"}`}>
                        {row.enviadoParaAprovacao ? "Enviado" : "Não enviado"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getSubmissionBadgeClass(row.statusEnvio)}`}>{formatSubmissionStatus(row.statusEnvio)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls label="Paginação do relatório de grupos" onPageChange={goToGroupPage} pagination={groupPagination} />
            {!groupLoading && groupRows.length === 0 ? <Notice message="Nenhum grupo encontrado para o filtro informado." /> : null}
          </>
        ) : (
          <>
            <form className="toolbar" onSubmit={applyLuckyFilters}>
              <label className="field">
                <span>Filtrar por aluno</span>
                <input
                  value={luckyFilters.search}
                  onChange={(event) => updateLuckyFilter("search", event.target.value)}
                  placeholder="Nome ou e-mail do aluno"
                />
              </label>
              <IconButton icon="filter_alt" label="Filtrar números da sorte" type="submit" />
            </form>
            {luckyLoading ? <Notice message="Carregando números da sorte..." /> : null}
            <table className="table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>E-mail</th>
                  <th>Cupons validados</th>
                  <th>Números da sorte</th>
                  <th>Aguardando distribuição</th>
                  <th>Última distribuição</th>
                </tr>
              </thead>
              <tbody>
                {luckyRows.map((row) => (
                  <tr key={(row.aluno && row.aluno.id) || row.totalNumerosSorte}>
                    <td>{row.aluno && row.aluno.name}</td>
                    <td>{row.aluno && row.aluno.email}</td>
                    <td>{formatNumber(row.totalCuponsValidados)}</td>
                    <td>
                      {formatLuckyNumbers(row.numerosDaSorte) ||
                        (Number(row.cuponsAguardandoNumeroSorte || 0) > 0 ? "Cupons validados aguardando distribuição" : "Sem números distribuídos")}
                    </td>
                    <td>{formatNumber(row.cuponsAguardandoNumeroSorte)}</td>
                    <td>{row.ultimaDistribuicaoEm ? formatDate(row.ultimaDistribuicaoEm) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls label="Paginação do relatório de números da sorte" onPageChange={goToLuckyPage} pagination={luckyPagination} />
            {!luckyLoading && luckyRows.length === 0 ? <Notice message="Nenhum aluno encontrado para o filtro informado." /> : null}
          </>
        )}
      </section>
    </div>
  );
}

function isEditableSubmission(status) {
  return ["pendente", "ajuste", "reprovado"].includes(String(status || "").trim().toLowerCase());
}

function StudentChallengesView({ apiClient }) {
  const [desafios, setDesafios] = useState([]);
  const [inscricoes, setInscricoes] = useState([]);
  const [envios, setEnvios] = useState([]);
  const [selectedInscricaoId, setSelectedInscricaoId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [subscribingId, setSubscribingId] = useState("");
  const [quizState, setQuizState] = useState(null);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizFeedback, setQuizFeedback] = useState("");
  const [quizError, setQuizError] = useState("");
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);

  async function load() {
    setError("");
    try {
      const [desafiosResult, inscricoesResult, enviosResult] = await Promise.all([
        apiClient.request({ method: "GET", path: "/desafios?limit=100" }),
        apiClient.request({ method: "GET", path: "/desafios/inscricoes/minhas" }),
        apiClient.request({ method: "GET", path: "/envios-desafios/meus?limit=100" }),
      ]);
      const nextInscricoes = getArray(inscricoesResult, "inscricoes").filter((inscricao) => isChallengeActive(inscricao.desafio));
      setDesafios(getArray(desafiosResult, "desafios"));
      setInscricoes(nextInscricoes);
      setEnvios(getArray(enviosResult, "envios"));
      setSelectedInscricaoId((current) =>
        nextInscricoes.some((inscricao) => inscricao.id === current) ? current : (nextInscricoes[0] && nextInscricoes[0].id) || ""
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  async function subscribe(desafioId, modalidade = "normal") {
    setFeedback("");
    setError("");
    setSubscribingId(desafioId);
    try {
      await apiClient.request(
        { method: "POST", path: `/desafios/${desafioId}/inscricoes` },
        { body: { modalidade } }
      );
      setFeedback(
        modalidade === "ingles"
          ? "Inscrição em inglês realizada. O grupo será formado apenas com alunos desta modalidade."
          : "Inscrição realizada. O grupo normal foi formado automaticamente."
      );
      await load();
    } catch (subscribeError) {
      setError(getErrorMessage(subscribeError));
    } finally {
      setSubscribingId("");
    }
  }

  async function cancelSubscription(inscricao) {
    if (!inscricao || (typeof window !== "undefined" && !window.confirm(`Cancelar a inscrição em "${inscricao.desafio ? inscricao.desafio.title : "este desafio"}"?`))) return;
    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "DELETE", path: `/desafios/inscricoes/${inscricao.id}` });
      setFeedback("Inscrição cancelada. Você poderá se inscrever novamente enquanto o desafio estiver aberto.");
      await load();
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    }
  }

  async function openQuiz(desafio) {
    setQuizLoading(true);
    setQuizError("");
    setQuizFeedback("");
    setQuizAnswer("");
    try {
      const result = await apiClient.request({ method: "GET", path: `/desafios/${desafio.id}/questionario` });
      setQuizState(result);
      if (result && result.resultado && result.resultado.message) setQuizFeedback(result.resultado.message);
    } catch (quizLoadError) {
      setQuizState(null);
      setQuizError(getErrorMessage(quizLoadError));
    } finally {
      setQuizLoading(false);
    }
  }

  function closeQuiz() {
    setQuizState(null);
    setQuizAnswer("");
    setQuizFeedback("");
    setQuizError("");
  }

  async function submitQuizAnswer(event) {
    event.preventDefault();
    if (!quizState || !quizState.desafio || !quizAnswer) {
      setQuizError("Selecione uma alternativa para responder.");
      return;
    }
    const questions = getArray(quizState.desafio.quiz, "questions");
    const currentIndex = Number(quizState.tentativa && quizState.tentativa.currentQuestionIndex) || 0;
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) {
      setQuizError("Não foi possível localizar a pergunta atual.");
      return;
    }

    setQuizSubmitting(true);
    setQuizError("");
    try {
      const result = await apiClient.request(
        { method: "POST", path: `/desafios/${quizState.desafio.id}/questionario/respostas` },
        { body: { questionId: currentQuestion.id, alternativeIndex: Number(quizAnswer) } }
      );
      setQuizState(result);
      setQuizFeedback(result && result.resultado ? result.resultado.message || "" : "");
      if (!result || !result.resultado || result.resultado.correct !== false) setQuizAnswer("");
      if (result && result.resultado && result.resultado.completed) await load();
    } catch (quizAnswerError) {
      setQuizError(getErrorMessage(quizAnswerError));
    } finally {
      setQuizSubmitting(false);
    }
  }

  function getInscricaoGroupId(inscricao) {
    return getEntityId(inscricao && inscricao.grupo);
  }

  function getEnvioGroupId(envio) {
    return getEntityId((envio && envio.grupoId) || (envio && envio.grupo));
  }

  function findEnvioForDesafio(desafio) {
    const desafioId = getEntityId(desafio);
    return (
      envios.find(
        (envio) =>
          getEntityId((envio && envio.desafioId) || (envio && envio.desafio)) === desafioId &&
          String(envio.status || "").toLowerCase() !== "cancelado"
      ) || null
    );
  }

  function findEnvioForInscricao(inscricao) {
    const grupoId = getInscricaoGroupId(inscricao);
    if (!grupoId) return null;
    return envios.find((envio) => getEnvioGroupId(envio) === grupoId && String(envio.status || "").toLowerCase() !== "cancelado") || null;
  }

  function findInscricaoForDesafio(desafio) {
    const desafioId = getEntityId(desafio);
    return inscricoes.find((inscricao) => getEntityId(inscricao.desafio) === desafioId) || null;
  }

  function findInscricaoForEnvio(envio) {
    const grupoId = getEnvioGroupId(envio);
    if (!grupoId) return null;
    return inscricoes.find((inscricao) => getInscricaoGroupId(inscricao) === grupoId) || null;
  }

  function getGroupParticipantCount(grupo) {
    const total = Number(grupo && grupo.totalParticipantes);
    if (Number.isFinite(total) && total > 0) return total;
    return getArray(grupo, "participantes").length;
  }

  function getGroupParticipantLimit(desafio, inscricao) {
    const grupo = inscricao && inscricao.grupo;
    const limit = Number((grupo && grupo.maxParticipantes) || (desafio && desafio.maxParticipantes) || 0);
    return Number.isFinite(limit) && limit > 0 ? limit : 1;
  }

  function formatChallengeGroupSize(desafio, inscricao) {
    const limit = getGroupParticipantLimit(desafio, inscricao);
    if (inscricao && inscricao.grupo) {
      return `${formatNumber(getGroupParticipantCount(inscricao.grupo))} de ${formatNumber(limit)} participantes`;
    }

    return `Até ${formatNumber(limit)} participantes`;
  }

  function getSubmissionParticipantCount(envio) {
    const total = Number((envio && envio.totalParticipantes) || (envio && envio.quantidadeParticipantes));
    if (Number.isFinite(total) && total > 0) return total;

    const participantIds = new Set();
    [envio && envio.aluno, envio && envio.responsavel, envio && envio.lider, ...getArray(envio, "participantesDetalhes"), ...getArray(envio, "participantes")]
      .map(getEntityId)
      .filter(Boolean)
      .forEach((participantId) => participantIds.add(participantId));

    return participantIds.size;
  }

  function getFirstEvidence(envio) {
    const evidencias = getArray(envio, "evidencias");
    const first = evidencias.find((item) => {
      if (typeof item === "string") return item.trim();
      if (!item || typeof item !== "object") return false;
      return item.url || item.link || item.text || item.texto;
    });
    if (typeof first === "string") return first;
    return first && (first.url || first.link || first.text || first.texto) ? first.url || first.link || first.text || first.texto : "";
  }

  function selectEnvioForEdit(envio) {
    const inscricao = findInscricaoForEnvio(envio);
    if (inscricao) {
      setSelectedInscricaoId(inscricao.id);
      setFeedback("Envio selecionado para edição.");
    }
  }

  async function submitEnvio(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const selectedInscricao = inscricoes.find((inscricao) => inscricao.id === selectedInscricaoId);
    const evidencia = String(data.get("evidencia") || "").trim();
    const existingEnvio = findEnvioForInscricao(selectedInscricao);
    setFeedback("");
    setError("");

    if (!selectedInscricao || !selectedInscricao.grupo) {
      setError("Selecione um desafio inscrito com grupo formado.");
      return;
    }

    if (!isChallengeActive(selectedInscricao.desafio)) {
      setError("Apenas desafios inscritos e ativos podem ser enviados ou editados.");
      return;
    }

    if (existingEnvio && !isEditableSubmission(existingEnvio.status)) {
      setError("Este envio já foi aprovado ou encerrado e não pode mais ser editado.");
      return;
    }

    let anexo = null;
    const body = {
      description: data.get("description"),
      evidencias: evidencia ? [evidencia] : [],
    };

    try {
      anexo = await readFileAsAttachment(data.get("anexo"));
      if (anexo) body.anexos = [anexo];
      if (existingEnvio) {
        await apiClient.request({ method: "PATCH", path: `/envios-desafios/${existingEnvio.id}` }, { body });
        setFeedback("Envio do grupo atualizado. Todos os integrantes continuam vendo a mesma versão.");
      } else {
        await apiClient.request({ method: "POST", path: "/envios-desafios" }, { body: { ...body, grupoId: getInscricaoGroupId(selectedInscricao) } });
        setFeedback("Envio registrado e enviado para aprovação. Todos os integrantes do grupo podem acompanhar e editar até a aprovação.");
      }
      form.reset();
      await load();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    }
  }

  const selectedInscricao = inscricoes.find((inscricao) => inscricao.id === selectedInscricaoId) || inscricoes[0];
  const selectedEnvio = findEnvioForInscricao(selectedInscricao);
  const selectedParticipants = getArray(selectedInscricao && selectedInscricao.grupo, "participantes");
  const selectedEnvioEditable =
    Boolean(selectedInscricao && isChallengeActive(selectedInscricao.desafio)) &&
    (!selectedEnvio || isEditableSubmission(selectedEnvio.status));

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Desafios</h2>
            <p className="muted">Inscreva-se nos desafios tradicionais. Questionários são individuais e começam em “Responder agora”.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar desafios" onClick={load} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <table className="table">
          <thead>
            <tr>
              <th>Desafio</th>
              <th>Pilares</th>
              <th>Pontos</th>
              <th>Entrega até</th>
              <th>Grupo</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {desafios.map((desafio) => {
              const quizChallenge = isQuizChallenge(desafio);
              const inscricao = findInscricaoForDesafio(desafio);
              const subscriptionState = getSubscriptionActionState(inscricao);
              const isSubscribed = subscriptionState.isSubscribed;
              const subscriptionMode = subscriptionState.modalidade;
              const participantNames = getGroupParticipantNames(inscricao);
              const desafioEnvio = findEnvioForDesafio(desafio);
              const quizRespondido = quizChallenge && Boolean(desafioEnvio);
              const desafioTradicionalEntregue = !quizChallenge && Boolean(desafioEnvio);
              return (
                <tr key={desafio.id}>
                  <td>
                    <strong>{desafio.title}</strong>
                    <p className="muted">{desafio.description}</p>
                  </td>
                  <td>{formatPilarPoints(desafio)}</td>
                  <td>{formatNumber(desafio.points)}</td>
                  <td>{formatDate(desafio.deliveryDate || desafio.dataEntrega)}</td>
                  <td>
                    {quizChallenge ? "Individual (questionário)" : formatChallengeGroupSize(desafio, inscricao)}
                    {!quizChallenge && isSubscribed ? <div className="muted">Modalidade: {subscriptionMode === "ingles" ? "Inglês" : "Normal"}</div> : null}
                    {!quizChallenge && isSubscribed ? (
                      <div className="muted">Integrantes: {participantNames.length > 0 ? participantNames.join(", ") : "Grupo em formação"}</div>
                    ) : null}
                  </td>
                  <td>
                    <div className="actions table-actions">
                      {quizChallenge ? (
                        <button
                          className={`button secondary with-icon${quizRespondido ? " quiz-responded" : ""}`}
                          type="button"
                          disabled={quizLoading}
                          onClick={() => openQuiz(desafio)}
                        >
                          <ButtonIcon name="quiz" />
                          {quizRespondido ? "Respondido" : "Responder agora"}
                        </button>
                      ) : null}
                      {!quizChallenge && subscriptionState.showNormal ? (
                          <button className="button secondary with-icon" type="button" disabled={subscriptionState.actionDisabled || subscribingId === desafio.id} onClick={() => subscribe(desafio.id, "normal")}>
                          <ButtonIcon name={isSubscribed ? "verified" : "how_to_reg"} />
                          {isSubscribed ? "Inscrito" : "Inscrever-se"}
                        </button>
                      ) : null}
                      {!quizChallenge && subscriptionState.showEnglish ? (
                        <button className="button secondary with-icon" type="button" disabled={subscriptionState.actionDisabled || subscribingId === desafio.id} onClick={() => subscribe(desafio.id, "ingles")}>
                          <ButtonIcon name={isSubscribed ? "verified" : "translate"} />
                          {isSubscribed ? "Inscrito em Inglês" : "Inscrever-se em Inglês"}
                        </button>
                      ) : null}
                      {!quizChallenge && isSubscribed && !desafioTradicionalEntregue ? (
                        <button className="button ghost with-icon" type="button" disabled={subscribingId === desafio.id} onClick={() => cancelSubscription(inscricao)}>
                          <ButtonIcon name="unsubscribe" />
                          Cancelar inscrição
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
          </section>

      {quizLoading ? (
        <section className="panel">
          <Notice message="Carregando questionário..." />
        </section>
      ) : null}

      {quizState ? (
        <section className="panel quiz-player">
          <div className="panel-header">
            <div>
              <h2>{quizState.desafio ? quizState.desafio.title : "Questionário"}</h2>
              <p className="muted">Responda corretamente para liberar a próxima pergunta.</p>
            </div>
            <button className="button ghost with-icon" type="button" onClick={closeQuiz}>
              <ButtonIcon name="close" />
              Fechar
            </button>
          </div>
          <Notice message={quizError} type="error" />
          <Notice message={quizFeedback} />
          {quizState.tentativa && quizState.tentativa.status === "concluido" ? (
            <div className="quiz-complete">
              <h3>Questionário concluído</h3>
              <p>Você acertou todas as perguntas e conquistou {formatNumber(quizState.tentativa.pointsAwarded)} pontos.</p>
              {quizState.conteudoFinal && normalizeOpenableHref(quizState.conteudoFinal.url) ? (
                <a className="button with-icon" href={normalizeOpenableHref(quizState.conteudoFinal.url)} rel="noreferrer" target="_blank">
                  <ButtonIcon name="menu_book" />
                  Acessar conteúdo exclusivo
                </a>
              ) : null}
            </div>
          ) : (
            (() => {
              const questions = getArray(quizState.desafio && quizState.desafio.quiz, "questions");
              const currentIndex = Number(quizState.tentativa && quizState.tentativa.currentQuestionIndex) || 0;
              const currentQuestion = questions[currentIndex];
              return currentQuestion ? (
                <div>
                  <div className="quiz-progress">
                    Pergunta {currentIndex + 1} de {questions.length}
                  </div>
                  <h3>{currentQuestion.prompt || currentQuestion.question}</h3>
                  <form className="quiz-answer" onSubmit={submitQuizAnswer}>
                    <div className="quiz-answer-options">
                      {getArray(currentQuestion, "alternatives").map((alternative, alternativeIndex) => (
                        <label className="quiz-answer-option" key={alternative.id || alternativeIndex}>
                          <input
                            checked={quizAnswer === String(alternativeIndex)}
                            name="quizAnswer"
                            type="radio"
                            value={alternativeIndex}
                            onChange={(event) => setQuizAnswer(event.target.value)}
                          />
                          <span>{typeof alternative === "object" ? alternative.text || alternative.texto : alternative}</span>
                        </label>
                      ))}
                    </div>
                    <button className="button with-icon" disabled={quizSubmitting} type="submit">
                      <ButtonIcon name="check_circle" />
                      Confirmar resposta
                    </button>
                  </form>
                </div>
              ) : <Notice message="Não há pergunta disponível no momento." type="error" />;
            })()
          )}
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Enviar desafio feito</h2>
            <p className="muted">Selecione uma inscrição. Os participantes vêm automaticamente do grupo.</p>
          </div>
        </div>
        {selectedEnvio ? (
          <Notice
            message={
              selectedEnvioEditable
                ? selectedEnvio.status === "reprovado"
                  ? "Este envio foi reprovado e pode ser corrigido e reenviado."
                  : "Este grupo já possui um envio. Você pode editar enquanto estiver pendente ou em ajuste."
                : "Este grupo já teve o envio aprovado ou encerrado. A edição está bloqueada."
            }
          />
        ) : null}
        {selectedEnvio && selectedEnvio.feedback ? <Notice message={`Feedback da avaliação: ${selectedEnvio.feedback}`} type="error" /> : null}
        <form className="form-grid" key={(selectedEnvio && selectedEnvio.id) || selectedInscricaoId || "novo-envio"} onSubmit={submitEnvio}>
          <label className="field span-2">
            <span>Desafio inscrito</span>
            <select required value={selectedInscricaoId} onChange={(event) => setSelectedInscricaoId(event.target.value)}>
              <option value="">Selecione</option>
              {inscricoes.map((inscricao) => (
                <option key={inscricao.id} value={inscricao.id}>
                  {inscricao.desafio ? inscricao.desafio.title : "Desafio sem título"} - {getSubscriptionMode(inscricao) === "ingles" ? "Inglês" : "Normal"}
                </option>
              ))}
            </select>
          </label>
          <div className="span-2 status-item">
            <strong>
              Participantes do grupo{selectedInscricao ? ` (${formatChallengeGroupSize(selectedInscricao.desafio, selectedInscricao)})` : ""}
            </strong>
            <span className="muted">
              {selectedParticipants.length > 0
                ? selectedParticipants.map((participante) => participante.name || "Participante sem nome").join(", ")
                : "Nenhum grupo selecionado"}
            </span>
          </div>
          <label className="field span-2">
            <span>Descrição</span>
            <textarea maxLength={4000} name="description" required defaultValue={(selectedEnvio && selectedEnvio.description) || ""} placeholder="Descreva o que foi feito." />
          </label>
          <label className="field span-2">
            <span>Evidência/link/comprovante opcional</span>
            <input maxLength={2048} name="evidencia" defaultValue={getFirstEvidence(selectedEnvio)} placeholder="https://..." />
          </label>
          <label className="field span-2">
            <span>Anexo opcional</span>
            <input name="anexo" type="file" />
          </label>
          {selectedEnvio && getArray(selectedEnvio, "anexos").length > 0 ? (
            <div className="status-item span-2">
              <span className="muted">Anexo atual</span>
              <LinkList download items={selectedEnvio.anexos} />
            </div>
          ) : null}
          <button className="button with-icon" type="submit" disabled={!selectedEnvioEditable}>
            <ButtonIcon name={selectedEnvio ? "save" : "send"} />
            {selectedEnvio ? "Atualizar envio" : "Enviar para aprovação"}
          </button>
        </form>
        {inscricoes.length === 0 ? <Notice message="Você não possui desafios inscritos e ativos disponíveis para envio." /> : null}
      </section>

      <section className="panel">
        <h2>Meus desafios enviados</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Desafio</th>
              <th>Enviado por</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Participantes</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {envios.map((envio) => {
              const challengeActive = isChallengeActive(envio.desafio);
              const submissionEditable = challengeActive && isEditableSubmission(envio.status) && findInscricaoForEnvio(envio);
              const participantNames = getSubmissionParticipantNames(envio);
              return (
                <tr key={envio.id}>
                  <td>
                    {envio.desafio ? envio.desafio.title : "Desafio sem título"}
                    <div className="muted">{challengeActive ? "Desafio ativo" : "Desafio inativo"}</div>
                  </td>
                  <td>{envio.aluno ? envio.aluno.name : "Integrante do grupo"}</td>
                  <td>{formatSubmissionType(envio.type)}</td>
                    <td>
                      {formatStatus(envio.status)}
                      {envio.feedback ? <div className="muted">Feedback: {envio.feedback}</div> : null}
                    </td>
                  <td>
                    <strong>{formatNumber(getSubmissionParticipantCount(envio))}</strong>
                    <div className="muted">{participantNames.length > 0 ? participantNames.join(", ") : "Integrantes não informados"}</div>
                  </td>
                  <td>
                    {submissionEditable ? (
                      <IconButton icon="edit" label="Editar envio do grupo" onClick={() => selectEnvioForEdit(envio)} />
                    ) : (
                      <span className="muted">Bloqueado</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StudentChecklistView({ apiClient }) {
  const [items, setItems] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checklistFilter, setChecklistFilter] = useState("pendentes");
  const [updatingItemId, setUpdatingItemId] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      const result = await apiClient.request({ method: "GET", path: buildListPath("/plano-estudo/itens", { limit: 500, page: 1, status: "ativo" }) });
      setItems(getArray(result, "itens"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [apiClient]);

  const checklistSummary = useMemo(() => buildChecklistSummaryViewModel(items), [items]);
  const totalPendingTasks = Math.max(checklistSummary.totalTarefas - checklistSummary.tarefasConcluidas, 0);
  const tarefasPorData = useMemo(
    () =>
      Object.entries(checklistSummary.tarefasPorData || {})
        .map(([dateKey, dayItems]) => [
          dateKey,
          dayItems.filter((item) => (checklistFilter === "concluidas" ? item.completed : !item.completed)),
        ])
        .filter(([, dayItems]) => dayItems.length > 0)
        .sort(([left], [right]) => left.localeCompare(right)),
    [checklistFilter, checklistSummary]
  );
  const emptyChecklistMessage =
    checklistFilter === "concluidas" ? "Nenhuma tarefa concluída encontrada." : "Nenhuma tarefa pendente encontrada.";

  async function toggleChecklistItem(item) {
    if (!canToggleChecklistItem(item)) {
      setFeedback("");
      setError("O check só pode ser marcado em tarefas de hoje ou de datas anteriores.");
      return;
    }
    setFeedback("");
    setError("");
    setUpdatingItemId(item.id);
    const nextCompleted = !item.completed;
    const updatedAt = nextCompleted ? new Date().toISOString() : null;
    const previousItems = items;
    setItems((currentItems) =>
      currentItems.map((currentItem) =>
        currentItem.id === item.id
          ? {
              ...currentItem,
              completed: nextCompleted,
              concluido: nextCompleted,
              completedAt: updatedAt,
              concluidoEm: updatedAt,
            }
          : currentItem
      )
    );
    try {
      await apiClient.request({ method: "PATCH", path: `/plano-estudo/itens/${item.id}` }, { body: { completed: nextCompleted } });
      setFeedback(nextCompleted ? "Tarefa concluída e movida para o filtro de concluídas." : "Tarefa reaberta e devolvida para pendentes.");
      await load();
    } catch (toggleError) {
      setItems(previousItems);
      setError(getErrorMessage(toggleError));
    } finally {
      setUpdatingItemId("");
    }
  }

  async function deleteChecklistItem(item) {
    if (typeof window !== "undefined" && !window.confirm(`Excluir a tarefa "${item.title}" do plano de estudo?`)) return;
    setFeedback("");
    setError("");
    setUpdatingItemId(item.id);
    const previousItems = items;
    setItems((currentItems) => currentItems.filter((currentItem) => currentItem.id !== item.id));
    try {
      await apiClient.request({ method: "DELETE", path: `/plano-estudo/itens/${item.id}` });
      setFeedback("Tarefa excluída do check-list e do plano de estudo.");
      await load();
    } catch (deleteError) {
      setItems(previousItems);
      setError(getErrorMessage(deleteError));
    } finally {
      setUpdatingItemId("");
    }
  }

  return (
    <div className="content">
      <section className="metrics metrics-4">
        <div className="metric">
          <span className="muted">Tarefas planejadas</span>
          <strong>{formatNumber(checklistSummary.totalTarefas)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Tarefas concluídas</span>
          <strong>{formatNumber(checklistSummary.tarefasConcluidas)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Dias concluídos</span>
          <strong>{formatNumber(checklistSummary.diasConcluidos || checklistSummary.diasComCheck)}</strong>
        </div>
        <div className="metric">
          <span className="muted">Pontos do checklist</span>
          <strong>{formatNumber(checklistSummary.totalPontos)}</strong>
        </div>
      </section>

      <Notice message={feedback} />
      <Notice message={error} type="error" />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Check-list</h2>
            <p className="muted">A pontuação considera quando tudo o que foi planejado para cada dia foi finalizado.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar check-list" onClick={load} />
        </div>
        <div className="status-grid">
          <div className="status-item">
            <span className="muted">Regra de pontuação</span>
            <strong>No prazo ou até 1 dia depois = 3 pontos</strong>
            <span className="muted">De 2 a 4 dias depois = 2 pontos · de 5 a 7 dias = 1 ponto</span>
          </div>
          <div className="status-item">
            <span className="muted">Quando não pontua</span>
            <strong>Mais de 7 dias depois = 0 ponto</strong>
            <span className="muted">Se houver mais de uma tarefa no mesmo dia, o dia só pontua quando todas forem concluídas.</span>
          </div>
        </div>
        {loading ? <Notice message="Carregando check-list..." /> : null}
        {!loading && checklistSummary.semanas.length === 0 ? <Notice message="Nenhum dia planejado foi encontrado." /> : null}
        {checklistSummary.semanas.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Data planejada</th>
                <th>Conclusão</th>
                <th>Atraso</th>
                <th>Tarefas concluídas</th>
                <th>Pontos</th>
              </tr>
            </thead>
            <tbody>
              {checklistSummary.semanas.map((semana) => (
                <tr key={semana.dataPlanejada || `${semana.inicio}-${semana.fim}`}>
                  <td>{formatCalendarDate(`${semana.dataPlanejada || semana.inicio}T00:00:00`)}</td>
                  <td>{semana.concluidoNoDia && semana.dataConclusao ? formatCalendarDate(`${semana.dataConclusao}T00:00:00`) : "Ainda não concluído"}</td>
                  <td>{semana.concluidoNoDia ? `${formatNumber(Math.max(Number(semana.diasAtraso || 0), 0))} dia(s)` : "-"}</td>
                  <td>{formatNumber(semana.tarefasConcluidas)} de {formatNumber(semana.totalTarefas)}</td>
                  <td>
                    {formatNumber(semana.pontos)}
                    {semana.faixaPontuacao ? <div className="muted">{semana.faixaPontuacao}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Tarefas planejadas</h2>
            <p className="muted">Ao marcar uma tarefa, ela sai da lista de pendentes e fica disponível no filtro de concluídas.</p>
          </div>
        </div>
        <div className="checklist-filter-bar">
          <div className="checklist-filter-actions">
            <button
              className={`button secondary${checklistFilter === "pendentes" ? " active" : ""}`}
              onClick={() => setChecklistFilter("pendentes")}
              type="button"
            >
              Pendentes ({formatNumber(totalPendingTasks)})
            </button>
            <button
              className={`button secondary${checklistFilter === "concluidas" ? " active" : ""}`}
              onClick={() => setChecklistFilter("concluidas")}
              type="button"
            >
              Concluídas ({formatNumber(checklistSummary.tarefasConcluidas)})
            </button>
          </div>
          <p className="muted">
            No filtro de concluídas você pode desativar o check para devolver a tarefa para a lista de pendentes.
          </p>
        </div>
        {!loading && tarefasPorData.length === 0 ? <Notice message={emptyChecklistMessage} /> : null}
        <div className="checklist-group-list">
          {tarefasPorData.map(([dateKey, dayItems]) => (
            <article className="checklist-day-card" key={dateKey}>
              <div className="panel-header">
                <div>
                  <h3>{formatCalendarDate(`${dateKey}T00:00:00`)}</h3>
                  <p className="muted">
                    {dayItems.length} tarefa(s) {checklistFilter === "concluidas" ? "concluída(s)" : "pendente(s)"}
                  </p>
                </div>
                <span className="badge">{checklistFilter === "concluidas" ? "Concluídas" : "Pendentes"}</span>
              </div>
              <div className="checklist-task-list">
                {dayItems.map((item) => {
                  const canToggleItem = canToggleChecklistItem(item);
                  const isCheckboxDisabled = updatingItemId === item.id || (!item.completed && !canToggleItem);

                  return (
                    <div className="checklist-task-row" key={item.id}>
                      <label className="checklist-task-check">
                        <input
                          checked={item.completed}
                          disabled={isCheckboxDisabled}
                          onChange={() => toggleChecklistItem(item)}
                          type="checkbox"
                        />
                        <span className="sr-only">Concluir tarefa: {item.title}</span>
                      </label>
                      <div className="checklist-task-content">
                        <strong>{item.title}</strong>
                        <p className="muted">
                          {item.startAt ? formatTime(item.startAt) : "Sem horário"}
                          {item.endAt ? ` - ${formatTime(item.endAt)}` : ""}
                        </p>
                        {item.notes ? <p className="muted">{item.notes}</p> : null}
                        {!item.completed && !canToggleItem ? <p className="muted">O check será liberado na data planejada.</p> : null}
                        {checklistFilter === "pendentes" ? (
                          <button
                            className="button ghost with-icon checklist-delete-button"
                            disabled={updatingItemId === item.id}
                            onClick={() => deleteChecklistItem(item)}
                            type="button"
                          >
                            <Icon name="delete" />
                            Excluir tarefa
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
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
  const checklistPlanejamento = score && score.checklistPlanejamento ? score.checklistPlanejamento : {};

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
        <div className="metric">
          <span className="muted">Pontos do check-list</span>
          <strong>{formatNumber(checklistPlanejamento.totalPontos)}</strong>
        </div>
      </section>
      <Notice message={error} type="error" />
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Minha Pontuação</h2>
            <p className="muted">O total soma os pontos dos desafios aprovados com os pontos do check-list, calculados pelo atraso de cada dia planejado.</p>
          </div>
          <IconButton icon="refresh" label="Atualizar pontuação" onClick={load} />
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
              <th>Pilares</th>
              <th>Pontos</th>
              <th>Composição</th>
              <th>Turma</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((item) => (
              <tr key={item.id}>
                <td>{item.desafio ? item.desafio.title : item.source === "pontuacao_extra" ? "Pontuação extra" : "Desafio sem título"}</td>
                <td>{formatPilarPoints(item)}</td>
                <td>{formatNumber(item.pontos)}</td>
                <td>{item.descricaoPontuacao || (item.apresentacaoAoVivo ? `${formatNumber(item.pontosBase)} base + ${formatNumber(item.bonusApresentacaoAoVivo)} apresentação ao vivo` : "")}</td>
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
          <IconButton icon="refresh" label="Atualizar grupos" onClick={load} />
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <div className="group-list">
          {grupos.map((grupo) => (
            <article className="status-item" key={grupo.id}>
              <div className="panel-header">
                <div>
                  <strong>{grupo.desafio ? grupo.desafio.title : "Desafio sem título"}</strong>
                  <p className="muted">
                    {grupo.turma ? grupo.turma.name : "-"} | {formatNumber(grupo.totalParticipantes)} de {formatNumber(grupo.maxParticipantes)} participantes | Modalidade: {grupo.modalidade === "ingles" ? "Inglês" : "Normal"}
                  </p>
                </div>
                <span className={`badge ${grupo.status === "completo" ? "ok" : "warn"}`}>{formatStatus(grupo.status)}</span>
              </div>
              <div className="participant-list">
                {getArray(grupo, "participantes").map((participante) => (
                  <span className="badge" key={participante.id || participante.name}>
                    {participante.name || "Participante sem nome"}
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
                <IconButton icon="save" label="Salvar contato" type="submit" />
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

function StudyPlanLegend({ legend = [] }) {
  return (
    <div className="calendar-legend">
      {legend.map((item) => (
        <span className="calendar-legend-item" key={item.key}>
          <span className="calendar-dot" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function StudyPlanCalendar({
  calendar,
  currentDateKey,
  loading,
  onDaySelect,
  onEventSelect,
  selectedDayKey,
}) {
  return (
    <div className="calendar-shell">
      <div className="calendar-grid">
        {calendar.weekdayLabels.map((label) => (
          <div className="calendar-weekday" key={label}>
            {label}
          </div>
        ))}
        {calendar.weeks.flat().map((cell) => {
          const dayEvents = calendar.eventsByDay[cell.key] || [];
          const isToday = cell.key === currentDateKey;
          const isSelected = cell.key === selectedDayKey;
          return (
            <button
              className={`calendar-cell${cell.inMonth ? "" : " outside"}${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
              key={cell.key}
              onClick={() => onDaySelect(cell)}
              type="button"
            >
              <span className="calendar-day-number">{cell.day}</span>
              <div className="calendar-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <span
                    className={`calendar-event-chip${event.readOnly ? " readonly" : ""}`}
                    key={`${cell.key}-${event.id}-${event.title}`}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onEventSelect(event);
                    }}
                    style={{ borderColor: event.color }}
                  >
                    <span className="calendar-dot" style={{ backgroundColor: event.color }} />
                    <span className="calendar-event-content">
                      {event.timeLabel ? <span className="calendar-event-time">{event.timeLabel}</span> : null}
                      <span className="calendar-event-title">{event.title}</span>
                    </span>
                  </span>
                ))}
                {dayEvents.length > 3 ? <span className="calendar-more">+{dayEvents.length - 3} eventos</span> : null}
              </div>
            </button>
          );
        })}
      </div>
      {loading ? <Notice message="Carregando agenda..." /> : null}
    </div>
  );
}

function StudyPlanSidebarFilters({ filters, onChange }) {
  return (
    <div className="calendar-filters">
      <label className="field checkbox-field">
        <input checked={filters.showMentoria} onChange={(event) => onChange("showMentoria", event.target.checked)} type="checkbox" />
        <span>Eventos da mentoria</span>
      </label>
      <label className="field checkbox-field">
        <input checked={filters.showPersonal} onChange={(event) => onChange("showPersonal", event.target.checked)} type="checkbox" />
        <span>Meu planejamento</span>
      </label>
    </div>
  );
}

function StudentPlanoEstudoView({ apiClient }) {
  const initialMonth = getCurrentMonthRef();
  const [monthRef, setMonthRef] = useState(initialMonth);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ showMentoria: true, showPersonal: true });
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const calendar = useMemo(
    () => buildCalendarViewModel({ ...monthRef, events, showMentoria: filters.showMentoria, showPersonal: filters.showPersonal }),
    [events, filters.showMentoria, filters.showPersonal, monthRef]
  );

  async function loadAgenda(nextMonthRef = monthRef) {
    setError("");
    setLoading(true);
    try {
      const result = await apiClient.request({
        method: "GET",
        path: buildListPath("/plano-estudo/agenda", buildAgendaQuery(nextMonthRef)),
      });
      setEvents(getArray(result, "agenda"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda(monthRef);
  }, [apiClient, monthRef.month, monthRef.year]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function navigateMonth(delta) {
    setMonthRef((current) => shiftMonth(current.year, current.month, delta));
    setSelectedDay(null);
    setSelectedEvent(null);
    setEditingItem(null);
  }

  async function createPersonalItem(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const title = data.get("title");
    const notes = data.get("notes") || undefined;
    const startAtInput = String(data.get("startAt") || "");
    const startAt = toIsoFromDateTimeInput(startAtInput);
    const durationMinutes = Number(data.get("durationMinutes"));
    const endAt = calculateEndAtFromDuration(startAt, durationMinutes);
    const plannedDateKey = getDateKeyFromDateTimeInput(startAtInput);
    const color = data.get("color") || undefined;
    const shouldReplicateWeek = data.get("replicateWeek") === "on";
    setFeedback("");
    setError("");
    setCreating(true);
    try {
      if (shouldReplicateWeek) {
        const weeklyQuery = buildWeeklyStudyQuery(startAt);
        const liveEventsResult = weeklyQuery
          ? await apiClient.request({
              method: "GET",
              path: buildListPath("/eventos-ao-vivo", { ...weeklyQuery, type: "ao_vivo" }),
            })
          : { eventos: [] };
        const sessions = buildWeeklyStudySessions({
          startAt,
          durationMinutes,
          liveEvents: getArray(liveEventsResult, "eventos"),
        });

        await Promise.all(
          sessions.map((session) =>
            apiClient.request(
              { method: "POST", path: "/plano-estudo/itens" },
              {
                body: {
                  title,
                  notes,
                  startAt: session.startAt,
                  endAt: session.endAt,
                  durationMinutes,
                  plannedDateKey: session.plannedDateKey,
                  scoreWindowStartKey: session.scoreWindowStartKey,
                  color,
                },
              }
            )
          )
        );

        const skippedDays = 7 - sessions.length;
        setFeedback(
          sessions.length > 0
            ? `Planejamento semanal criado em ${sessions.length} dia(s). ${skippedDays > 0 ? `${skippedDays} dia(s) foram ignorados por já terem evento ao vivo.` : "Nenhum dia precisou ser bloqueado."}`
            : "Nenhum dia livre encontrado nos próximos 7 dias porque todos já têm evento ao vivo."
        );
      } else {
        await apiClient.request(
          { method: "POST", path: "/plano-estudo/itens" },
          {
            body: {
              title,
              notes,
              startAt,
              endAt,
              durationMinutes,
              plannedDateKey,
              color,
            },
          }
        );
        setFeedback("Planejamento pessoal cadastrado.");
      }
      form.reset();
      setSelectedDay(null);
      await loadAgenda();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  async function updatePersonalItem(event) {
    event.preventDefault();
    if (!editingItem) return;
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      const startAt = toIsoFromDateTimeInput(data.get("editStartAt"));
      const durationMinutes = Number(data.get("editDurationMinutes"));
      const endAt = calculateEndAtFromDuration(startAt, durationMinutes);
      await apiClient.request(
        { method: "PATCH", path: `/plano-estudo/itens/${editingItem.id}` },
        {
          body: {
            title: data.get("editTitle"),
            notes: data.get("editNotes") || undefined,
            startAt,
            endAt,
            durationMinutes,
            color: data.get("editColor") || undefined,
          },
        }
      );
      setEditingItem(null);
      setSelectedEvent(null);
      setFeedback("Planejamento pessoal atualizado.");
      await loadAgenda();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function deletePersonalItem(item) {
    if (typeof window !== "undefined" && !window.confirm(`Excluir o planejamento "${item.title}"?`)) return;
    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "DELETE", path: `/plano-estudo/itens/${item.id}` });
      setEditingItem(null);
      setSelectedEvent(null);
      setFeedback("Planejamento pessoal excluído.");
      await loadAgenda();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  const currentDateKey = toDateKey(new Date());
  const dayEvents = selectedDay ? calendar.eventsByDay[selectedDay.key] || [] : [];

  return (
    <div className="content calendar-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Plano de Estudo</h2>
            <p className="muted">Agenda mensal com eventos da mentoria (somente leitura) e seu planejamento pessoal.</p>
          </div>
          <div className="calendar-toolbar">
            <IconButton icon="today" label="Mês atual" onClick={() => setMonthRef(getCurrentMonthRef())} />
            <IconButton icon="chevron_left" label="Mês anterior" onClick={() => navigateMonth(-1)} />
            <strong>{calendar.monthLabel}</strong>
            <IconButton icon="chevron_right" label="Próximo mês" onClick={() => navigateMonth(1)} />
            <IconButton icon="refresh" label="Atualizar agenda" onClick={() => loadAgenda()} />
          </div>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <StudyPlanLegend legend={calendar.legend} />
        <div className="calendar-controls">
          <StudyPlanSidebarFilters filters={filters} onChange={updateFilter} />
        </div>
        <StudyPlanCalendar
          calendar={calendar}
          currentDateKey={currentDateKey}
          loading={loading}
          onDaySelect={setSelectedDay}
          onEventSelect={setSelectedEvent}
          selectedDayKey={selectedDay ? selectedDay.key : ""}
        />
      </section>

      {selectedDay ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Eventos de {formatCalendarDate(selectedDay.date)}</h2>
            <IconButton className="button ghost" icon="close" label="Fechar dia" onClick={() => setSelectedDay(null)} />
          </div>
          {dayEvents.length === 0 ? <Notice message="Nenhum evento neste dia." /> : null}
          <div className="calendar-day-list">
            {dayEvents.map((event) => (
              <button className="calendar-day-item" key={`${event.id}-${event.title}`} onClick={() => setSelectedEvent(event)} type="button">
                <span className="calendar-dot" style={{ backgroundColor: event.color }} />
                <div>
                  <strong>{event.title}</strong>
                  <p className="muted">
                    {formatTime(event.startAt)}
                    {event.endAt ? ` - ${formatTime(event.endAt)}` : ""}
                    {event.readOnly ? " · Evento da mentoria" : " · Meu planejamento"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedEvent ? (
        <section className="panel">
          <div className="panel-header">
            <h2>{selectedEvent.title}</h2>
            <IconButton className="button ghost" icon="close" label="Fechar evento" onClick={() => setSelectedEvent(null)} />
          </div>
          <div className="detail-grid">
            <div>
              <span className="muted">Início</span>
              <strong>{formatCalendarDate(selectedEvent.startAt)} {formatTime(selectedEvent.startAt)}</strong>
            </div>
            <div>
              <span className="muted">Fim</span>
              <strong>{selectedEvent.endAt ? `${formatCalendarDate(selectedEvent.endAt)} ${formatTime(selectedEvent.endAt)}` : "Sem horário de término"}</strong>
            </div>
            <div>
              <span className="muted">Origem</span>
              <strong>{selectedEvent.readOnly ? "Evento da mentoria (somente leitura)" : "Meu planejamento"}</strong>
            </div>
            {selectedEvent.guestName ? (
              <div>
                <span className="muted">Convidado</span>
                <strong>{selectedEvent.guestName}</strong>
              </div>
            ) : null}
            {selectedEvent.weekNumber ? (
              <div>
                <span className="muted">Semana</span>
                <strong>Semana {selectedEvent.weekNumber}</strong>
              </div>
            ) : null}
            {selectedEvent.notes ? (
              <div className="span-2">
                <span className="muted">Observações</span>
                <strong>{selectedEvent.notes}</strong>
              </div>
            ) : null}
          </div>
          {selectedEvent.editable ? (
            <div className="actions">
              <IconButton className="button secondary" icon="edit" label="Editar planejamento" onClick={() => setEditingItem(selectedEvent)} />
              <IconButton className="button danger" icon="delete" label="Excluir planejamento" onClick={() => deletePersonalItem(selectedEvent)} />
            </div>
          ) : (
            <Notice message="Eventos cadastrados pelo administrador não podem ser alterados pelo aluno." />
          )}
        </section>
      ) : null}

      {editingItem ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Editar planejamento</h2>
            <IconButton className="button ghost" icon="close" label="Cancelar edição" onClick={() => setEditingItem(null)} />
          </div>
          <form className="form-grid" key={editingItem.id} onSubmit={updatePersonalItem}>
            <label className="field span-2">
              <span>Título</span>
            <input defaultValue={editingItem.title} maxLength={160} name="editTitle" required />
            </label>
            <label className="field">
              <span>Início</span>
              <input defaultValue={formatDateTimeInputValue(editingItem.startAt)} name="editStartAt" required type="datetime-local" />
            </label>
            <label className="field">
              <span>Tempo de estudo (minutos)</span>
              <input defaultValue={getStudyDurationMinutes(editingItem.startAt, editingItem.endAt)} min="1" max="1440" name="editDurationMinutes" required type="number" />
            </label>
            <label className="field span-2">
              <span>Observações</span>
              <textarea defaultValue={editingItem.notes || ""} maxLength={4000} name="editNotes" />
            </label>
            <label className="field">
              <span>Cor</span>
              <input defaultValue={editingItem.color || "#8502ab"} name="editColor" type="color" />
            </label>
            <IconButton className="button" icon="save" label="Salvar planejamento" type="submit" />
          </form>
        </section>
      ) : null}

      <section className="panel calendar-create-panel">
        <div className="panel-header">
          <div>
            <h2>Novo planejamento</h2>
            <p className="muted">Cadastre seus estudos abaixo sem tirar espaço da visualização do calendário.</p>
          </div>
        </div>
        <form className="form-grid calendar-form" onSubmit={createPersonalItem}>
          <label className="field span-2">
            <span>Título</span>
            <input name="title" maxLength={160} required placeholder="Revisar conteúdo do módulo" />
          </label>
          <label className="field">
            <span>Início</span>
            <input
              defaultValue={selectedDay ? `${selectedDay.key}T09:00` : ""}
              key={selectedDay ? selectedDay.key : "new-item-start"}
              name="startAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>Tempo de estudo (minutos)</span>
            <input defaultValue="90" min="1" max="1440" name="durationMinutes" required type="number" />
          </label>
          <label className="field span-2">
            <span>Observações</span>
            <textarea maxLength={4000} name="notes" placeholder="Detalhes do seu estudo" />
          </label>
          <label className="checkbox-field span-2">
            <input name="replicateWeek" type="checkbox" />
            <span>Planejar a semana inteira com conteúdos gravados, replicando o tempo informado por dia apenas nos próximos 7 dias sem evento ao vivo.</span>
          </label>
          <label className="field">
            <span>Cor</span>
            <input defaultValue="#8502ab" name="color" type="color" />
          </label>
          <IconButton className="button" disabled={creating} icon="add" label={creating ? "Adicionando planejamento" : "Adicionar planejamento"} type="submit" />
        </form>
      </section>
    </div>
  );
}

function AdminPlanoEstudoView({ apiClient }) {
  const initialMonth = getCurrentMonthRef();
  const [monthRef, setMonthRef] = useState(initialMonth);
  const [events, setEvents] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [filters, setFilters] = useState({ turmaId: "", type: "" });
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const calendar = useMemo(
    () => buildCalendarViewModel({ ...monthRef, events, showMentoria: true, showPersonal: false }),
    [events, monthRef]
  );

  async function loadTurmas() {
    try {
      const result = await apiClient.request({ method: "GET", path: buildListPath("/turmas", { limit: 100, page: 1 }) });
      setTurmas(getArray(result, "turmas"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    }
  }

  async function loadEvents(nextMonthRef = monthRef, nextFilters = filters) {
    setError("");
    setLoading(true);
    try {
      const result = await apiClient.request({
        method: "GET",
        path: buildListPath("/eventos-ao-vivo", {
          ...buildAgendaQuery(nextMonthRef),
          turmaId: nextFilters.turmaId || undefined,
          type: nextFilters.type || undefined,
        }),
      });
      setEvents(getArray(result, "eventos"));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTurmas();
  }, [apiClient]);

  useEffect(() => {
    loadEvents(monthRef, filters);
  }, [apiClient, monthRef.month, monthRef.year, filters.turmaId, filters.type]);

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function navigateMonth(delta) {
    setMonthRef((current) => shiftMonth(current.year, current.month, delta));
    setSelectedDay(null);
    setSelectedEvent(null);
    setEditingEvent(null);
  }

  async function createEvent(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFeedback("");
    setError("");
    setCreating(true);
    try {
      const startAt = toIsoFromDateTimeInput(data.get("startAt"));
      const durationMinutes = Number(data.get("durationMinutes"));
      const endAt = calculateEndAtFromDuration(startAt, durationMinutes);
      await apiClient.request(
        { method: "POST", path: "/eventos-ao-vivo" },
        {
          body: {
            title: data.get("title"),
            description: data.get("description") || undefined,
            turmaId: data.get("turmaId"),
            type: data.get("type"),
            startAt,
            endAt,
            durationMinutes,
            guestName: data.get("guestName") || undefined,
            weekNumber: data.get("weekNumber") ? Number(data.get("weekNumber")) : undefined,
            link: data.get("link") || undefined,
          },
        }
      );
      form.reset();
      setFeedback("Evento ao vivo cadastrado.");
      setSelectedDay(null);
      await loadEvents();
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreating(false);
    }
  }

  async function updateEvent(event) {
    event.preventDefault();
    if (!editingEvent) return;
    const data = new FormData(event.currentTarget);
    setFeedback("");
    setError("");
    try {
      const startAt = toIsoFromDateTimeInput(data.get("editStartAt"));
      const durationMinutes = Number(data.get("editDurationMinutes"));
      const endAt = calculateEndAtFromDuration(startAt, durationMinutes);
      await apiClient.request(
        { method: "PATCH", path: `/eventos-ao-vivo/${editingEvent.id}` },
        {
          body: {
            title: data.get("editTitle"),
            description: data.get("editDescription") || undefined,
            turmaId: data.get("editTurmaId"),
            type: data.get("editType"),
            startAt,
            endAt,
            durationMinutes,
            guestName: data.get("editGuestName") || undefined,
            weekNumber: data.get("editWeekNumber") ? Number(data.get("editWeekNumber")) : undefined,
            link: data.get("editLink") || undefined,
            status: data.get("editStatus"),
          },
        }
      );
      setEditingEvent(null);
      setSelectedEvent(null);
      setFeedback("Evento ao vivo atualizado.");
      await loadEvents();
    } catch (updateError) {
      setError(getErrorMessage(updateError));
    }
  }

  async function deleteEvent(evento) {
    if (typeof window !== "undefined" && !window.confirm(`Excluir o evento "${evento.title}"?`)) return;
    setFeedback("");
    setError("");
    try {
      await apiClient.request({ method: "DELETE", path: `/eventos-ao-vivo/${evento.id}` });
      setEditingEvent(null);
      setSelectedEvent(null);
      setFeedback("Evento ao vivo excluído.");
      await loadEvents();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    }
  }

  const currentDateKey = toDateKey(new Date());
  const dayEvents = selectedDay ? calendar.eventsByDay[selectedDay.key] || [] : [];

  return (
    <div className="content calendar-layout">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Plano de Estudo</h2>
            <p className="muted">Cadastre a agenda de eventos ao vivo, módulos gravados e convidados especiais por turma.</p>
          </div>
          <div className="calendar-toolbar">
            <IconButton icon="today" label="Mês atual" onClick={() => setMonthRef(getCurrentMonthRef())} />
            <IconButton icon="chevron_left" label="Mês anterior" onClick={() => navigateMonth(-1)} />
            <strong>{calendar.monthLabel}</strong>
            <IconButton icon="chevron_right" label="Próximo mês" onClick={() => navigateMonth(1)} />
            <IconButton icon="refresh" label="Atualizar agenda" onClick={() => loadEvents()} />
          </div>
        </div>
        <Notice message={feedback} />
        <Notice message={error} type="error" />
        <StudyPlanLegend legend={calendar.legend.filter((item) => item.key !== "personal")} />
        <form className="toolbar" onSubmit={(event) => event.preventDefault()}>
          <label className="field">
            <span>Filtrar por turma</span>
            <select onChange={(event) => updateFilter("turmaId", event.target.value)} value={filters.turmaId}>
              <option value="">Todas as turmas</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo de evento</span>
            <select onChange={(event) => updateFilter("type", event.target.value)} value={filters.type}>
              <option value="">Todos os tipos</option>
              <option value="ao_vivo">Ao vivo</option>
              <option value="modulo_gravado">Módulo gravado</option>
              <option value="conteudo_especial">Convidado especial</option>
            </select>
          </label>
        </form>
        <StudyPlanCalendar
          calendar={calendar}
          currentDateKey={currentDateKey}
          loading={loading}
          onDaySelect={setSelectedDay}
          onEventSelect={setSelectedEvent}
          selectedDayKey={selectedDay ? selectedDay.key : ""}
        />
      </section>

      {selectedDay ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Eventos de {formatCalendarDate(selectedDay.date)}</h2>
            <IconButton className="button ghost" icon="close" label="Fechar dia" onClick={() => setSelectedDay(null)} />
          </div>
          {dayEvents.length === 0 ? <Notice message="Nenhum evento neste dia." /> : null}
          <div className="calendar-day-list">
            {dayEvents.map((event) => (
              <button className="calendar-day-item" key={`${event.id}-${event.title}`} onClick={() => setSelectedEvent(event)} type="button">
                <span className="calendar-dot" style={{ backgroundColor: event.color }} />
                <div>
                  <strong>{event.title}</strong>
                  <p className="muted">
                    {formatTime(event.startAt)}
                    {event.endAt ? ` - ${formatTime(event.endAt)}` : ""}
                    {event.turmaName ? ` · ${event.turmaName}` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedEvent ? (
        <section className="panel">
          <div className="panel-header">
            <h2>{selectedEvent.title}</h2>
            <IconButton className="button ghost" icon="close" label="Fechar evento" onClick={() => setSelectedEvent(null)} />
          </div>
          <div className="detail-grid">
            <div>
              <span className="muted">Início</span>
              <strong>{formatCalendarDate(selectedEvent.startAt)} {formatTime(selectedEvent.startAt)}</strong>
            </div>
            <div>
              <span className="muted">Fim</span>
              <strong>{selectedEvent.endAt ? `${formatCalendarDate(selectedEvent.endAt)} ${formatTime(selectedEvent.endAt)}` : "Sem horário de término"}</strong>
            </div>
            <div>
              <span className="muted">Tipo</span>
              <strong>{selectedEvent.meta.label}</strong>
            </div>
            {selectedEvent.turmaName ? (
              <div>
                <span className="muted">Turma</span>
                <strong>{selectedEvent.turmaName}</strong>
              </div>
            ) : null}
            {selectedEvent.guestName ? (
              <div>
                <span className="muted">Convidado</span>
                <strong>{selectedEvent.guestName}</strong>
              </div>
            ) : null}
            {selectedEvent.notes ? (
              <div className="span-2">
                <span className="muted">Descrição</span>
                <strong>{selectedEvent.notes}</strong>
              </div>
            ) : null}
          </div>
          <div className="actions">
            <IconButton className="button secondary" icon="edit" label="Editar evento" onClick={() => setEditingEvent(selectedEvent)} />
            <IconButton className="button danger" icon="delete" label="Excluir evento" onClick={() => deleteEvent(selectedEvent)} />
          </div>
        </section>
      ) : null}

      {editingEvent ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Editar evento</h2>
            <IconButton className="button ghost" icon="close" label="Cancelar edição" onClick={() => setEditingEvent(null)} />
          </div>
          <form className="form-grid" key={editingEvent.id} onSubmit={updateEvent}>
            <label className="field span-2">
              <span>Título</span>
              <input defaultValue={editingEvent.title} maxLength={160} name="editTitle" required />
            </label>
            <label className="field">
              <span>Turma</span>
              <select defaultValue={editingEvent.turmaId || ""} name="editTurmaId" required>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Tipo</span>
              <select defaultValue={editingEvent.type || "ao_vivo"} name="editType">
                <option value="ao_vivo">Ao vivo</option>
                <option value="modulo_gravado">Módulo gravado</option>
                <option value="conteudo_especial">Convidado especial</option>
              </select>
            </label>
            <label className="field">
              <span>Início</span>
              <input defaultValue={formatDateTimeInputValue(editingEvent.startAt)} min="2026-01-01T00:00" name="editStartAt" required type="datetime-local" />
            </label>
            <label className="field">
              <span>Tempo de estudo (minutos)</span>
              <input defaultValue={getStudyDurationMinutes(editingEvent.startAt, editingEvent.endAt)} min="1" max="1440" name="editDurationMinutes" required type="number" />
            </label>
            <label className="field">
              <span>Semana</span>
              <input defaultValue={editingEvent.weekNumber || ""} min="1" name="editWeekNumber" type="number" />
            </label>
            <label className="field">
              <span>Convidado</span>
              <input defaultValue={editingEvent.guestName || ""} maxLength={120} name="editGuestName" />
            </label>
            <label className="field">
              <span>Status</span>
              <select defaultValue="ativo" name="editStatus">
                <option value="ativo">ativo</option>
                <option value="inativo">inativo</option>
              </select>
            </label>
            <label className="field span-2">
              <span>Descrição</span>
              <textarea defaultValue={editingEvent.notes || ""} maxLength={4000} name="editDescription" />
            </label>
            <label className="field span-2">
              <span>Link</span>
              <input defaultValue={editingEvent.link || ""} maxLength={2048} name="editLink" />
            </label>
            <IconButton className="button" icon="save" label="Salvar evento" type="submit" />
          </form>
        </section>
      ) : null}

      <section className="panel calendar-create-panel">
        <div className="panel-header">
          <div>
            <h2>Novo Evento</h2>
            <p className="muted">O cadastro fica no final da página para o calendário ocupar toda a largura disponível.</p>
          </div>
        </div>
        <form className="form-grid calendar-form" onSubmit={createEvent}>
          <label className="field span-2">
            <span>Título</span>
            <input name="title" maxLength={160} required placeholder="Lógica e Programação" />
          </label>
          <label className="field">
            <span>Turma</span>
            <select name="turmaId" required defaultValue="">
              <option disabled value="">
                Selecione a turma
              </option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tipo</span>
            <select defaultValue="ao_vivo" name="type">
              <option value="ao_vivo">Ao vivo</option>
              <option value="modulo_gravado">Módulo gravado</option>
              <option value="conteudo_especial">Convidado especial</option>
            </select>
          </label>
          <label className="field">
            <span>Início</span>
            <input
              defaultValue={selectedDay ? `${selectedDay.key}T19:00` : ""}
              key={selectedDay ? selectedDay.key : "new-event-start"}
              min="2026-01-01T00:00"
              name="startAt"
              required
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>Tempo de estudo (minutos)</span>
            <input defaultValue="90" min="1" max="1440" name="durationMinutes" required type="number" />
          </label>
          <label className="field">
            <span>Semana</span>
            <input min="1" name="weekNumber" placeholder="4" type="number" />
          </label>
          <label className="field">
            <span>Convidado</span>
            <input maxLength={120} name="guestName" placeholder="Matheus Leão" />
          </label>
          <label className="field span-2">
            <span>Descrição</span>
            <textarea maxLength={4000} name="description" placeholder="Detalhes do evento" />
          </label>
          <label className="field span-2">
            <span>Link</span>
            <input maxLength={2048} name="link" placeholder="https://..." />
          </label>
          <IconButton className="button" disabled={creating} icon="add" label={creating ? "Cadastrando evento" : "Cadastrar evento"} type="submit" />
        </form>
      </section>
    </div>
  );
}

function Workspace({ apiBaseUrl, apiClient, onLogout, onThemeChange, onUserChange, theme, user }) {
  const [activeView, setActiveView] = useState(getInitialView(user));
  const [selectedMenu, setSelectedMenu] = useState(null);
  const role = getRole(user);
  const menu = MENU_BY_ROLE[role].filter((item) => !item.roles || item.roles.includes(user.role));

  function navigate(item) {
    setSelectedMenu(item);
    setActiveView(item.key);
    window.localStorage.setItem(`desafios.view.${role}`, item.key);
  }

  return (
    <main className="workspace">
      <Sidebar activeView={activeView} menu={menu} onNavigate={navigate} onLogout={onLogout} user={user} />
      <section className="main">
        <header className="topbar">
          <div>
            <h1>{role === "admin" ? "Área do professor/admin" : "Área do aluno"}</h1>
            <p className="muted">API REST em {apiBaseUrl}</p>
          </div>
          <div className="actions">
            <IconButton icon={theme === "dark" ? "light_mode" : "dark_mode"} label={`Tema ${theme === "dark" ? "claro" : "escuro"}`} onClick={onThemeChange} />
          </div>
        </header>

        {activeView === "configuracoes" ? <ConfigurationView apiClient={apiClient} /> : null}
        {activeView === "dashboard" && role === "admin" ? <AdminDashboardView apiClient={apiClient} /> : null}
        {activeView === "alunos" ? <AdminStudentsView apiClient={apiClient} /> : null}
        {activeView === "cupons" ? <AdminCouponsView apiClient={apiClient} /> : null}
        {activeView === "turmas" ? <AdminTurmasView apiClient={apiClient} /> : null}
        {activeView === "pilares" ? <AdminPilaresView apiClient={apiClient} /> : null}
        {activeView === "desafios" && role === "admin" ? <AdminDesafiosView apiClient={apiClient} /> : null}
        {activeView === "desafios" && role === "aluno" ? <StudentChallengesView apiClient={apiClient} /> : null}
        {activeView === "aprovacoes" ? <AdminApprovalsView apiClient={apiClient} /> : null}
        {activeView === "ranking" ? <AdminRankingView apiClient={apiClient} /> : null}
        {activeView === "relatorios" ? <AdminReportsView apiClient={apiClient} /> : null}
        {activeView === "meus-grupos" ? <StudentGroupsView apiClient={apiClient} /> : null}
        {activeView === "checklist" ? <StudentChecklistView apiClient={apiClient} /> : null}
        {activeView === "plano-estudo" && role === "aluno" ? <StudentPlanoEstudoView apiClient={apiClient} /> : null}
        {activeView === "plano-estudo" && role === "admin" ? <AdminPlanoEstudoView apiClient={apiClient} /> : null}
        {activeView === "pontuacao" ? <StudentScoreView apiClient={apiClient} /> : null}
        {activeView === "perfil" ? <ProfileView apiClient={apiClient} onUserChange={onUserChange} user={user} /> : null}
        {activeView === "inicio" ? <HomeView apiClient={apiClient} user={user} /> : null}
        {![
          "configuracoes",
          "dashboard",
          "alunos",
          "cupons",
          "turmas",
          "pilares",
          "desafios",
          "aprovacoes",
          "ranking",
          "relatorios",
          "meus-grupos",
          "checklist",
          "plano-estudo",
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
  const [operationNotice, setOperationNotice] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState(() => resolveApiBaseUrl());

  useEffect(() => {
    const storedSession = window.localStorage.getItem("desafios.session");
    const storedTheme = window.localStorage.getItem("desafios.theme");
    if (storedTheme) setTheme(storedTheme);
    setApiBaseUrl(resolveApiBaseUrl());
    if (storedSession) {
      try {
        setSession(JSON.parse(storedSession));
      } catch {
        window.localStorage.removeItem("desafios.session");
      }
    }
  }, []);

  useEffect(() => {
    function handleStorage(event) {
      if (event.key !== "desafios.session") return;
      if (!event.newValue) {
        setSession(null);
        return;
      }

      try {
        setSession(JSON.parse(event.newValue));
      } catch {
        setSession(null);
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("desafios.theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!operationNotice) return undefined;
    const timeoutId = window.setTimeout(() => setOperationNotice(""), 4500);
    return () => window.clearTimeout(timeoutId);
  }, [operationNotice]);

  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: apiBaseUrl,
        getToken: () => session && session.token,
        onUnauthorized: () => {
          window.localStorage.removeItem("desafios.session");
          setSession(null);
        },
        onMutationSuccess: ({ endpoint, method }) => {
          if (endpoint === "/auth/login") return;
          setOperationNotice(method === "DELETE" ? "Operação concluída com sucesso." : "Alterações gravadas com sucesso.");
        },
      }),
    [apiBaseUrl, session]
  );

  async function login(credentials) {
    const result = await apiClient.request({ method: "POST", path: "/auth/login" }, { body: credentials });
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
      {operationNotice ? (
        <div className="operation-notice" role="status">
          <Icon name="check_circle" />
          {operationNotice}
        </div>
      ) : null}
      {session ? (
        <Workspace
          apiBaseUrl={apiBaseUrl}
          apiClient={apiClient}
          onLogout={logout}
          onThemeChange={toggleTheme}
          onUserChange={updateSessionUser}
          theme={theme}
          user={session.user}
        />
      ) : (
        <LoginScreen theme={theme} onThemeChange={toggleTheme} onLogin={login} />
      )}
    </div>
  );
}
