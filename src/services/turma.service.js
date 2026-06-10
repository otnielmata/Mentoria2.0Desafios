const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_VIEWER_ROLES = ["professor", "admin"];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function parsePositiveInteger(value, fieldName, defaultValue) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const parsedValue = Number(value);
  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    throw createHttpError(`${fieldName} deve ser um número inteiro maior que zero.`, 400);
  }

  return parsedValue;
}

function parsePagination(query = {}) {
  const page = parsePositiveInteger(query.page, "page", DEFAULT_PAGE);
  const requestedLimit = parsePositiveInteger(query.limit, "limit", DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function normalizeStatusFilter(status) {
  if (status === undefined || status === null || status === "") {
    return undefined;
  }

  if (typeof status !== "string") {
    throw createHttpError("status deve ser um texto válido.", 400);
  }

  const normalizedStatus = status.trim();
  return normalizedStatus.length > 0 ? normalizedStatus : undefined;
}

function getTurmaId(turma) {
  if (turma.id) {
    return turma.id;
  }

  if (turma._id && typeof turma._id.toString === "function") {
    return turma._id.toString();
  }

  return turma._id;
}

function toIsoDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function hasAvailableTotals(totals) {
  return totals && typeof totals === "object" && !Array.isArray(totals) && Object.keys(totals).length > 0;
}

function serializeTurma(turma) {
  const serializedTurma = {
    id: getTurmaId(turma),
    name: turma.name,
    status: turma.status,
  };

  if (turma.startDate) {
    serializedTurma.startDate = toIsoDate(turma.startDate);
  }

  if (turma.endDate) {
    serializedTurma.endDate = toIsoDate(turma.endDate);
  }

  if (hasAvailableTotals(turma.totals)) {
    serializedTurma.totals = turma.totals;
  }

  return serializedTurma;
}

async function assertCanListTurmas(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_VIEWER_ROLES.includes(normalizeRole(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode listar turmas.", 403);
  }
}

async function listTurmas(authenticatedUserId, query = {}) {
  await assertCanListTurmas(authenticatedUserId);

  const pagination = parsePagination(query);
  const status = normalizeStatusFilter(query.status);
  const filters = {};

  if (status) {
    filters.status = status;
  }

  const turmasQuery = Turma.find(filters)
    .sort({ createdAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();

  const [turmas, total] = await Promise.all([turmasQuery, Turma.countDocuments(filters)]);

  return {
    turmas: turmas.map(serializeTurma),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
}

module.exports = {
  listTurmas,
};
