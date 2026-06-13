export const ENV_KEYS = {
  apiBaseUrl: "NEXT_PUBLIC_API_BASE_URL",
};

export function getApiBaseUrl(env = process.env) {
  return String(env[ENV_KEYS.apiBaseUrl] || "").trim();
}

export function isApiBaseUrlConfigured(env = process.env) {
  return getApiBaseUrl(env).length > 0;
}
