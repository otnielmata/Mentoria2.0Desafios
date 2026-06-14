export const publicEnvKeys = {
  apiBaseUrl: "NEXT_PUBLIC_API_BASE_URL",
  appEnv: "NEXT_PUBLIC_APP_ENV",
};

export const defaultPublicEnv = {
  apiBaseUrl: "http://localhost:3000",
  appEnv: "development",
};

function cleanText(value) {
  return String(value || "").trim();
}

export function normalizeApiBaseUrl(value = defaultPublicEnv.apiBaseUrl) {
  const cleanValue = cleanText(value) || defaultPublicEnv.apiBaseUrl;

  return cleanValue.replace(/\/+$/, "");
}

export function normalizeAppEnv(value = defaultPublicEnv.appEnv) {
  const cleanValue = cleanText(value).toLowerCase();

  return cleanValue || defaultPublicEnv.appEnv;
}

export function getPublicEnv(source = process.env) {
  return {
    apiBaseUrl: normalizeApiBaseUrl(source[publicEnvKeys.apiBaseUrl]),
    appEnv: normalizeAppEnv(source[publicEnvKeys.appEnv] || source.VERCEL_ENV || source.NODE_ENV),
  };
}

export function isPublicEnvKey(key = "") {
  return key.startsWith("NEXT_PUBLIC_");
}

export function looksLikeSecretKey(key = "") {
  return /(SECRET|TOKEN|PASSWORD|PRIVATE|MONGODB|JWT|DATABASE)/i.test(key);
}

export const publicEnv = getPublicEnv();
