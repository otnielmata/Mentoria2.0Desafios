const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_CREATOR_ROLES = ["professor", "admin"];
const ACTIVE_STATUS = "ativa";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hasOwn(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload, field);
}

function assertObjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError("Corpo da requisição deve ser um objeto JSON.", 400);
  }
}

function assertRequiredText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createHttpError(`${label} é obrigatório.`, 400);
  }

  return value.trim();
}

function parseOptionalDate(value, label) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${label} inválida.`, 400);
  }

  return date;
}

function serializeTurma(turma) {
  const serializedTurma = {
    id: turma.id,
    name: turma.name,
    status: turma.status,
  };

  if (turma.startDate) {
    serializedTurma.startDate = turma.startDate.toISOString();
  }

  if (turma.endDate) {
    serializedTurma.endDate = turma.endDate.toISOString();
  }

  return serializedTurma;
}

async function assertCanCreateTurma(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_CREATOR_ROLES.includes(authenticatedUser.role)) {
    throw createHttpError("Apenas professor ou admin pode cadastrar turmas.", 403);
  }
}

async function createTurma(authenticatedUserId, payload = {}) {
  assertObjectPayload(payload);
  await assertCanCreateTurma(authenticatedUserId);

  const name = assertRequiredText(payload.name, "Nome");
  const startDate = parseOptionalDate(payload.startDate, "Data inicial");
  const endDate = parseOptionalDate(payload.endDate, "Data final");

  if (startDate && endDate && startDate > endDate) {
    throw createHttpError("Data inicial não pode ser posterior à data final.", 400);
  }

  const turmaData = {
    name,
    status: ACTIVE_STATUS,
  };

  if (hasOwn(payload, "startDate")) {
    turmaData.startDate = startDate;
  }

  if (hasOwn(payload, "endDate")) {
    turmaData.endDate = endDate;
  }

  const turma = await Turma.create(turmaData);
  return serializeTurma(turma);
}

module.exports = {
  createTurma,
};
