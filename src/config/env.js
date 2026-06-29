const dotenv = require("dotenv");

dotenv.config();

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function resolveVercelUrl() {
  const vercelUrl = firstNonEmpty(
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL
  );

  if (!vercelUrl) return "";
  return /^https?:\/\//i.test(vercelUrl) ? vercelUrl : `https://${vercelUrl}`;
}

function resolveAppEnv() {
  return firstNonEmpty(
    process.env.APP_ENV,
    process.env.VERCEL_ENV,
    process.env.NODE_ENV
  ) || "development";
}

function resolveGitBranch() {
  return firstNonEmpty(
    process.env.VERCEL_GIT_COMMIT_REF,
    process.env.GIT_BRANCH
  ) || null;
}

function resolveBaseUrl() {
  const appEnv = resolveAppEnv();
  const configuredBaseUrl = firstNonEmpty(
    process.env.BASE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );
  const normalizedVercelUrl = resolveVercelUrl();

  if (configuredBaseUrl) {
    const isConfiguredLocalHost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredBaseUrl);
    if (appEnv !== "preview" && (!isConfiguredLocalHost || !normalizedVercelUrl)) return configuredBaseUrl;
    if (appEnv === "preview" && !isConfiguredLocalHost && !/vercel\.app$/i.test(new URL(configuredBaseUrl).hostname)) {
      return configuredBaseUrl;
    }
  }

  if (normalizedVercelUrl) return normalizedVercelUrl;

  return "http://localhost:3000";
}

function resolveMongoUri() {
  return (
    firstNonEmpty(
      process.env.MONGODB_URI,
      process.env.DATABASE_URL,
      process.env.MONGO_URL,
      process.env.MONGO_URI
    ) || "mongodb://localhost:27017/mentoria_api"
  );
}

function resolveMongoEnvName() {
  if (firstNonEmpty(process.env.MONGODB_URI)) return "MONGODB_URI";
  if (firstNonEmpty(process.env.DATABASE_URL)) return "DATABASE_URL";
  if (firstNonEmpty(process.env.MONGO_URL)) return "MONGO_URL";
  if (firstNonEmpty(process.env.MONGO_URI)) return "MONGO_URI";
  return "fallback";
}

function resolveMongoDbName() {
  const appEnv = resolveAppEnv();
  const gitBranch = resolveGitBranch();
  const configuredDbName = firstNonEmpty(
    process.env.MONGODB_DB_NAME,
    process.env.MONGO_DB_NAME,
    process.env.DB_NAME
  );
  if (configuredDbName) return configuredDbName;

  if (appEnv === "preview" || gitBranch === "codex/dev-vercel-preview") {
    return "test";
  }

  const mongoUri = resolveMongoUri();
  const match = mongoUri.match(/^[a-z]+:\/\/[^/]+\/([^?]+)/i);
  if (!match) return "mentoria_api";

  const dbName = decodeURIComponent(match[1] || "").trim();
  return dbName && dbName !== "/" ? dbName : "mentoria_api";
}

module.exports = {
  appEnv: resolveAppEnv(),
  gitBranch: resolveGitBranch(),
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  baseUrl: resolveBaseUrl(),
  mongoUri: resolveMongoUri(),
  mongoEnvName: resolveMongoEnvName(),
  mongoDbName: resolveMongoDbName(),
  jwtSecret: process.env.JWT_SECRET || "fallback-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
};
