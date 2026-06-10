const mongoose = require("mongoose");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_VIEWER_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function getDocumentId(document) {
  if (document.id) {
    return document.id;
  }

  if (document._id && typeof document._id.toString === "function") {
    return document._id.toString();
  }

  return document._id;
}

function toIsoDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function serializeTurma(turma, studentCount) {
  const serializedTurma = {
    id: getDocumentId(turma),
    name: turma.name,
    status: turma.status,
    studentCount,
  };

  if (turma.startDate) {
    serializedTurma.startDate = toIsoDate(turma.startDate);
  }

  if (turma.endDate) {
    serializedTurma.endDate = toIsoDate(turma.endDate);
  }

  return serializedTurma;
}

async function assertCanViewTurma(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_VIEWER_ROLES.includes(normalizeRole(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode visualizar turmas.", 403);
  }
}

async function getTurmaById(authenticatedUserId, turmaId) {
  await assertCanViewTurma(authenticatedUserId);

  if (!mongoose.isValidObjectId(turmaId)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  const turma = await Turma.findById(turmaId).lean();
  if (!turma) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  const studentCount = await User.countDocuments({
    role: STUDENT_ROLE,
    turmas: turma._id || turma.id || turmaId,
  });

  return serializeTurma(turma, studentCount);
}

module.exports = {
  getTurmaById,
};
