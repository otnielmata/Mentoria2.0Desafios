const STORAGE_KEY = "mentoria-session";

function canUseStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

export function saveSession(session) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
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
