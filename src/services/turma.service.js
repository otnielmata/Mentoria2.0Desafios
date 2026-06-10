const mongoose = require("mongoose");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_CLOSER_ROLES = ["professor", "admin"];
const CLOSED_STATUS = "encerrada";
const DELETED_STATUSES = ["deletada", "deletado", "deleted", "excluida", "excluido"];

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
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

async function assertCanCloseTurma(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_CLOSER_ROLES.includes(normalizeText(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode encerrar turmas.", 403);
  }
}

async function closeTurma(authenticatedUserId, turmaId) {
  await assertCanCloseTurma(authenticatedUserId);

  if (!mongoose.isValidObjectId(turmaId)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  const turma = await Turma.findById(turmaId);
  if (!turma || isDeletedTurma(turma)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  turma.status = CLOSED_STATUS;
  const closedTurma = await turma.save();

  return serializeTurma(closedTurma);
}

module.exports = {
  closeTurma,
};
