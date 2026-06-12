const STORAGE_KEY = "mentoria-session";

function canUseStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

function sanitizeUser(user = {}) {
  return {
    id: user.id || user._id || "",
    name: user.name || user.nome || "",
    email: user.email || "",
    role: user.role || user.perfil || "",
  };
}

function sanitizeSession(session = {}) {
  return {
    token: session.token || "",
    user: sanitizeUser(session.user || session.usuario),
  };
}

export function saveSession(session) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeSession(session)));
}

export function getSession() {
  if (!canUseStorage()) {
    return null;
  }

  const rawSession = window.localStorage.getItem(STORAGE_KEY);
  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession);
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
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
