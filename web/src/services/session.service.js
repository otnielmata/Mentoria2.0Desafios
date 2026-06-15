export const SESSION_STORAGE_KEY = "mentoria-session";
export const validSessionRoles = Object.freeze(["aluno", "professor", "admin"]);
export const validSessionStatuses = Object.freeze(["ativo", "inativo"]);

const SESSION_CHANGED_EVENT = "mentoria-session-changed";
const sessionListeners = new Set();

function canUseStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

function emitSessionChange(session) {
  sessionListeners.forEach((listener) => listener(session));

  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent === "function") {
    window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT, { detail: session }));
  }
}

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  if (typeof atob === "function") {
    return atob(padded);
  }

  return Buffer.from(padded, "base64").toString("utf8");
}

export function getTokenPayload(token) {
  if (!token || typeof token !== "string" || token.split(".").length < 2) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function isTokenExpired(token, now = Date.now()) {
  const payload = getTokenPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return now >= payload.exp * 1000;
}

export function sanitizeUser(user = {}) {
  const { _id, email, id, name, role, status } = user;

  return Object.fromEntries(
    Object.entries({
      _id,
      email,
      id,
      name,
      role,
      status,
    }).filter(([, value]) => value !== undefined && value !== null)
  );
}

export function hasCompleteSessionUser(user = {}) {
  return validSessionRoles.includes(user.role) && validSessionStatuses.includes(user.status);
}

export function normalizeSession(session) {
  const token = typeof session?.token === "string" ? session.token : "";
  const user = sanitizeUser(session?.user);

  if (!token || isTokenExpired(token) || !hasCompleteSessionUser(user)) {
    return null;
  }

  return {
    token,
    user,
  };
}

export function subscribeSession(listener) {
  sessionListeners.add(listener);

  return () => {
    sessionListeners.delete(listener);
  };
}

export function saveSession(session) {
  const normalizedSession = normalizeSession(session);

  if (!normalizedSession) {
    clearSession();
    return null;
  }

  if (canUseStorage()) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
  }

  emitSessionChange(normalizedSession);
  return normalizedSession;
}

export function getSession() {
  if (!canUseStorage()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    const session = normalizeSession(JSON.parse(rawSession));

    if (!session) {
      clearSession();
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function getToken() {
  return getSession()?.token || "";
}

export function getCurrentUser() {
  return getSession()?.user || null;
}

export function clearSession() {
  if (canUseStorage()) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  emitSessionChange(null);
}
