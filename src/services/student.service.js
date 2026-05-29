const mongoose = require("mongoose");
const User = require("../models/user.model");

const ALLOWED_VIEWER_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function serializeTurma(turma) {
  if (!turma || typeof turma !== "object") {
    return { id: String(turma) };
  }

  const serializedTurma = {
    id: String(turma.id || turma._id || turma),
  };

  if (turma.name) {
    serializedTurma.name = turma.name;
  }

  return serializedTurma;
}

function serializeStudent(user) {
  const student = {
    id: user.id || String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };

  if (Array.isArray(user.turmas) && user.turmas.length > 0) {
    student.turmas = user.turmas.map(serializeTurma);
  }

  if (
    user.pointsSummary &&
    typeof user.pointsSummary === "object" &&
    Object.keys(user.pointsSummary).length > 0
  ) {
    student.pointsSummary = user.pointsSummary;
  }

  return student;
}

async function assertCanViewStudents(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_VIEWER_ROLES.includes(authenticatedUser.role)) {
    throw createHttpError("Apenas professor ou admin pode visualizar alunos.", 403);
  }
}

async function getStudentById(authenticatedUserId, studentId) {
  await assertCanViewStudents(authenticatedUserId);

  if (!mongoose.isValidObjectId(studentId)) {
    throw createHttpError("Aluno não encontrado.", 404);
  }

  const student = await User.findOne({ _id: studentId, role: STUDENT_ROLE })
    .select("-password -passwordHash")
    .populate("turmas")
    .lean();

  if (!student) {
    throw createHttpError("Aluno não encontrado.", 404);
  }

  return serializeStudent(student);
}

module.exports = {
  getStudentById,
};
