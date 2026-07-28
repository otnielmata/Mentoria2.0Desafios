const app = require("../src/app");
const { connectDatabase } = require("../src/config/database");

function normalizePathSegments(pathValue) {
  if (Array.isArray(pathValue)) return pathValue.filter(Boolean);
  if (typeof pathValue === "string") return pathValue.split("/").filter(Boolean);
  return [];
}

function rebuildApiRequestUrl(req) {
  const originalUrl = req.url || "/";
  const [pathname, search = ""] = originalUrl.split("?");
  if (pathname !== "/api") return originalUrl;

  const searchParams = new URLSearchParams(search);
  const pathSegments = normalizePathSegments(req.query && req.query.path);

  if (pathSegments.length === 0) return originalUrl;

  searchParams.delete("path");
  const nextSearch = searchParams.toString();
  return `/api/${pathSegments.join("/")}${nextSearch ? `?${nextSearch}` : ""}`;
}

module.exports = async function handler(req, res) {
  await connectDatabase();
  req.url = rebuildApiRequestUrl(req);
  return app(req, res);
};
