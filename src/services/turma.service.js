const mongoose = require("mongoose");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_REMOVER_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const REMOVED_STATUS = "removida";
const ABSENT_STATUS = "ausente";
const DELETED_TURMA_STATUSES = ["deletada", "deletado", "deleted", "excluida", "excluido"];

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeId(value) {
  if (!value) {
    return "";
  }

  if (value.id) {
    return String(value.id);
  }

  if (value._id) {
    return normalizeId(value._id);
  }

  if (typeof value.toString === "function") {
    return value.toString();
  }

  return String(value);
}

function isDeletedTurma(turma) {
  return Boolean(turma.deletedAt) || DELETED_TURMA_STATUSES.includes(normalizeText(turma.status));
}

function serializeRemoval(student, turma, removed) {
  const studentId = normalizeId(student);
  const turmaId = normalizeId(turma);

  return {
    id: `${turmaId}:${studentId}`,
    turmaId,
    studentId,
    status: removed ? REMOVED_STATUS : ABSENT_STATUS,
    removed,
    student: {
      id: studentId,
      name: student.name,
      email: student.email,
    },
    turma: {
      id: turmaId,
      name: turma.name,
      status: turma.status,
    },
  };
}

async function assertCanRemoveStudent(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_REMOVER_ROLES.includes(normalizeText(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode remover alunos de turmas.", 403);
  }
}

function assertValidIds(turmaId, alunoId) {
  if (!mongoose.isValidObjectId(turmaId)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  if (!mongoose.isValidObjectId(alunoId)) {
    throw createHttpError("Aluno não encontrado.", 404);
  }
}

async function removeStudentFromTurma(authenticatedUserId, turmaId, alunoId) {
  await assertCanRemoveStudent(authenticatedUserId);
  assertValidIds(turmaId, alunoId);

  const turma = await Turma.findById(turmaId);
  if (!turma || isDeletedTurma(turma)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  const student = await User.findOne({ _id: alunoId, role: STUDENT_ROLE });
  if (!student) {
    throw createHttpError("Aluno não encontrado.", 404);
  }

  const currentTurmas = Array.isArray(student.turmas) ? student.turmas : [];
  const nextTurmas = currentTurmas.filter((turmaRef) => normalizeId(turmaRef) !== turmaId);
  const removed = nextTurmas.length !== currentTurmas.length;

  if (removed) {
    student.turmas = nextTurmas;
    await student.save();
  }

  return serializeRemoval(student, turma, removed);
}

module.exports = {
  removeStudentFromTurma,
};
