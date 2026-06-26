const dotenv = require("dotenv");

dotenv.config();

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function resolveBaseUrl() {
  const configuredBaseUrl = firstNonEmpty(
    process.env.BASE_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL
  );
  const vercelUrl = firstNonEmpty(
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL
  );
  const normalizedVercelUrl = vercelUrl
    ? /^https?:\/\//i.test(vercelUrl)
      ? vercelUrl
      : `https://${vercelUrl}`
    : "";

  if (configuredBaseUrl) {
    const isConfiguredLocalHost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredBaseUrl);
    if (!isConfiguredLocalHost || !normalizedVercelUrl) return configuredBaseUrl;
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
  const configuredDbName = firstNonEmpty(
    process.env.MONGODB_DB_NAME,
    process.env.MONGO_DB_NAME,
    process.env.DB_NAME
  );
  if (configuredDbName) return configuredDbName;

  const mongoUri = resolveMongoUri();
  const match = mongoUri.match(/^[a-z]+:\/\/[^/]+\/([^?]+)/i);
  if (!match) return "";

  const dbName = decodeURIComponent(match[1] || "").trim();
  return dbName && dbName !== "/" ? dbName : "";
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  baseUrl: resolveBaseUrl(),
  mongoUri: resolveMongoUri(),
  mongoEnvName: resolveMongoEnvName(),
  mongoDbName: resolveMongoDbName(),
  jwtSecret: process.env.JWT_SECRET || "fallback-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
};
