const Pilar = require("../models/pilar.model");
const User = require("../models/user.model");

const ACTIVE_STATUS = "ativo";
const FILTER_ROLES = ["professor", "admin"];

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function normalizeStatus(status) {
  return typeof status === "string" ? status.trim().toLowerCase() : "";
}

function hasStatusFilter(query = {}) {
  return query.status !== undefined && query.status !== null && query.status !== "";
}

function parseStatusFilter(query = {}) {
  if (!hasStatusFilter(query)) {
    return undefined;
  }

  if (typeof query.status !== "string") {
    throw createHttpError("status deve ser um texto válido.", 400);
  }

  const status = normalizeStatus(query.status);
  return status.length > 0 ? status : undefined;
}

function serializePilar(pilar) {
  const serializedPilar = {
    id: pilar.id || String(pilar._id),
    name: pilar.name,
    status: pilar.status,
  };

  if (pilar.description) {
    serializedPilar.description = pilar.description;
  }

  return serializedPilar;
}

async function getAuthenticatedUser(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  return authenticatedUser;
}

function buildFilters(authenticatedUser, query = {}) {
  const role = normalizeRole(authenticatedUser.role);
  const canFilterByStatus = FILTER_ROLES.includes(role);

  if (!canFilterByStatus) {
    return { status: ACTIVE_STATUS };
  }

  const status = parseStatusFilter(query);
  return status ? { status } : { status: ACTIVE_STATUS };
}

async function listPilares(authenticatedUserId, query = {}) {
  const authenticatedUser = await getAuthenticatedUser(authenticatedUserId);
  const filters = buildFilters(authenticatedUser, query);

  const pilares = await Pilar.find(filters).sort({ name: 1 }).lean();

  return pilares.map(serializePilar);
}

module.exports = {
  listPilares,
};
