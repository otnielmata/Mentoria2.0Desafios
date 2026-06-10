const mongoose = require("mongoose");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_EDITOR_ROLES = ["professor", "admin"];
const EDITABLE_FIELDS = ["name", "startDate", "endDate", "status"];
const DELETED_STATUSES = ["deletada", "deletado", "deleted", "excluida", "excluido"];

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hasOwn(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload, field);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function assertObjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError("Corpo da requisição deve ser um objeto JSON.", 400);
  }
}

function assertHasEditableField(payload) {
  const hasEditableField = EDITABLE_FIELDS.some((field) => hasOwn(payload, field));

  if (!hasEditableField) {
    throw createHttpError("Informe ao menos um campo para atualizar.", 400);
  }
}

function parseOptionalText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createHttpError(`${label} deve ser um texto válido.`, 400);
  }

  return value.trim();
}

function parseOptionalDate(value, label) {
  if (value === null || value === "") {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${label} inválida.`, 400);
  }

  return date;
}

function toComparableDate(value) {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
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

function isDeletedTurma(turma) {
  return Boolean(turma.deletedAt) || DELETED_STATUSES.includes(normalizeText(turma.status));
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

  return serializedTurma;
}

function buildUpdates(payload, turma) {
  assertObjectPayload(payload);
  assertHasEditableField(payload);

  const updates = {};

  if (hasOwn(payload, "name")) {
    updates.name = parseOptionalText(payload.name, "Nome");
  }

  if (hasOwn(payload, "status")) {
    updates.status = parseOptionalText(payload.status, "Status");
  }

  if (hasOwn(payload, "startDate")) {
    updates.startDate = parseOptionalDate(payload.startDate, "Data inicial");
  }

  if (hasOwn(payload, "endDate")) {
    updates.endDate = parseOptionalDate(payload.endDate, "Data final");
  }

  const nextStartDate = hasOwn(updates, "startDate") ? updates.startDate : toComparableDate(turma.startDate);
  const nextEndDate = hasOwn(updates, "endDate") ? updates.endDate : toComparableDate(turma.endDate);

  if (nextStartDate && nextEndDate && nextStartDate > nextEndDate) {
    throw createHttpError("Data inicial não pode ser posterior à data final.", 400);
  }

  return updates;
}

async function assertCanEditTurma(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_EDITOR_ROLES.includes(normalizeText(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode editar turmas.", 403);
  }
}

async function updateTurma(authenticatedUserId, turmaId, payload = {}) {
  await assertCanEditTurma(authenticatedUserId);

  if (!mongoose.isValidObjectId(turmaId)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  const turma = await Turma.findById(turmaId);
  if (!turma || isDeletedTurma(turma)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  const updates = buildUpdates(payload, turma);

  Object.assign(turma, updates);
  const updatedTurma = await turma.save();

  return serializeTurma(updatedTurma);
}

module.exports = {
  updateTurma,
};
