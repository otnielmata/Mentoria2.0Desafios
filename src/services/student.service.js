const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_CREATOR_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";

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

function assertRequiredText(payload, field, label) {
  if (!hasOwn(payload, field) || typeof payload[field] !== "string" || payload[field].trim().length === 0) {
    throw createHttpError(`${label} é obrigatório.`, 400);
  }

  return payload[field].trim();
}

function serializeTurmas(turmas = []) {
  return turmas.map((turma) => String(turma.id || turma._id || turma));
}

function serializeStudent(user) {
  const student = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  if (Array.isArray(user.turmas) && user.turmas.length > 0) {
    student.turmas = serializeTurmas(user.turmas);
  }

  return student;
}

async function assertCanCreateStudent(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_CREATOR_ROLES.includes(authenticatedUser.role)) {
    throw createHttpError("Apenas professor ou admin pode cadastrar alunos.", 403);
  }
}

async function resolveInitialTurma(turmaId) {
  if (typeof turmaId !== "string" || turmaId.trim().length === 0) {
    throw createHttpError("Turma inicial inválida.", 400);
  }

  const normalizedTurmaId = turmaId.trim();
  if (!mongoose.isValidObjectId(normalizedTurmaId)) {
    throw createHttpError("Turma inicial inválida.", 400);
  }

  const turma = await Turma.findById(normalizedTurmaId);
  if (!turma) {
    throw createHttpError("Turma inicial não encontrada.", 400);
  }

  return turma;
}

async function createStudent(authenticatedUserId, payload = {}) {
  assertObjectPayload(payload);
  await assertCanCreateStudent(authenticatedUserId);

  const name = assertRequiredText(payload, "name", "Nome");
  const email = assertRequiredText(payload, "email", "E-mail").toLowerCase();
  const password = assertRequiredText(payload, "password", "Senha");

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createHttpError("E-mail já está em uso.", 409);
  }

  const turma = hasOwn(payload, "turmaId") ? await resolveInitialTurma(payload.turmaId) : null;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const student = await User.create({
      name,
      email,
      passwordHash,
      role: STUDENT_ROLE,
      status: ACTIVE_STATUS,
      turmas: turma ? [turma._id || turma.id] : [],
    });

    return serializeStudent(student);
  } catch (error) {
    if (error && error.code === 11000) {
      throw createHttpError("E-mail já está em uso.", 409);
    }

    throw error;
  }
}

module.exports = {
  createStudent,
};
