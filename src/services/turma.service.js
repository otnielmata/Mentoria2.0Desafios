const mongoose = require("mongoose");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_ENROLLER_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STUDENT_STATUS = "ativo";
const ACTIVE_TURMA_STATUS = "ativa";
const ENROLLMENT_STATUS = "ativa";
const DELETED_TURMA_STATUSES = ["deletada", "deletado", "deleted", "excluida", "excluido"];

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

function getDocumentId(document) {
  return normalizeId(document);
}

function assertObjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError("Corpo da requisição deve ser um objeto JSON.", 400);
  }
}

function resolveStudentId(payload) {
  assertObjectPayload(payload);

  const studentId = hasOwn(payload, "studentId") ? payload.studentId : payload.alunoId;
  if (typeof studentId !== "string" || studentId.trim().length === 0) {
    throw createHttpError("studentId é obrigatório.", 400);
  }

  const normalizedStudentId = studentId.trim();
  if (!mongoose.isValidObjectId(normalizedStudentId)) {
    throw createHttpError("Aluno não encontrado.", 404);
  }

  return normalizedStudentId;
}

function isDeletedTurma(turma) {
  return Boolean(turma.deletedAt) || DELETED_TURMA_STATUSES.includes(normalizeText(turma.status));
}

function assertActiveTurma(turma) {
  if (normalizeText(turma.status) !== ACTIVE_TURMA_STATUS) {
    throw createHttpError("Turma deve estar ativa para matrícula.", 400);
  }
}

function assertActiveStudent(student) {
  if (normalizeText(student.status) !== ACTIVE_STUDENT_STATUS) {
    throw createHttpError("Aluno deve estar ativo para matrícula.", 400);
  }
}

function assertNotEnrolled(student, turmaId) {
  const enrolledTurmas = Array.isArray(student.turmas) ? student.turmas : [];
  const isAlreadyEnrolled = enrolledTurmas.some((turma) => normalizeId(turma) === turmaId);

  if (isAlreadyEnrolled) {
    throw createHttpError("Aluno já matriculado nesta turma.", 409);
  }
}

function serializeEnrollment(student, turma) {
  const studentId = getDocumentId(student);
  const turmaId = getDocumentId(turma);

  return {
    id: `${turmaId}:${studentId}`,
    turmaId,
    studentId,
    status: ENROLLMENT_STATUS,
    student: {
      id: studentId,
      name: student.name,
      email: student.email,
      status: student.status,
    },
    turma: {
      id: turmaId,
      name: turma.name,
      status: turma.status,
    },
  };
}

async function assertCanEnrollStudent(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_ENROLLER_ROLES.includes(normalizeText(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode matricular alunos em turmas.", 403);
  }
}

async function enrollStudent(authenticatedUserId, turmaId, payload = {}) {
  await assertCanEnrollStudent(authenticatedUserId);

  if (!mongoose.isValidObjectId(turmaId)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  const studentId = resolveStudentId(payload);
  const turma = await Turma.findById(turmaId);
  if (!turma || isDeletedTurma(turma)) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  assertActiveTurma(turma);

  const student = await User.findOne({ _id: studentId, role: STUDENT_ROLE });
  if (!student) {
    throw createHttpError("Aluno não encontrado.", 404);
  }

  assertActiveStudent(student);
  assertNotEnrolled(student, turmaId);

  if (!Array.isArray(student.turmas)) {
    student.turmas = [];
  }

  student.turmas.push(turma._id || turma.id || turmaId);
  const enrolledStudent = await student.save();

  return serializeEnrollment(enrolledStudent, turma);
}

module.exports = {
  enrollStudent,
};
