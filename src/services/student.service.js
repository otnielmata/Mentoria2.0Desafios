const mongoose = require("mongoose");
const User = require("../models/user.model");

const ALLOWED_VIEWER_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePositiveInteger(value, fallback, maxValue) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createHttpError("Parâmetros de paginação inválidos.", 400);
  }

  return maxValue ? Math.min(parsed, maxValue) : parsed;
}

function serializeTurmas(turmas = []) {
  return turmas.map((turma) => String(turma.id || turma._id || turma));
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
    student.turmas = serializeTurmas(user.turmas);
  }

  return student;
}

async function assertCanListStudents(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_VIEWER_ROLES.includes(authenticatedUser.role)) {
    throw createHttpError("Apenas professor ou admin pode listar alunos.", 403);
  }
}

function buildStudentFilters(query) {
  const filters = {
    role: STUDENT_ROLE,
  };

  if (query.status) {
    filters.status = String(query.status).trim();
  }

  if (query.turmaId) {
    const turmaId = String(query.turmaId).trim();
    if (!mongoose.isValidObjectId(turmaId)) {
      throw createHttpError("Turma inválida para filtro.", 400);
    }

    filters.turmas = turmaId;
  }

  const searchText = query.search || query.q;
  if (searchText) {
    const search = String(searchText).trim();
    if (search.length > 0) {
      const regex = new RegExp(escapeRegex(search), "i");
      filters.$or = [{ name: regex }, { email: regex }];
    }
  }

  return filters;
}

async function listStudents(authenticatedUserId, query = {}) {
  await assertCanListStudents(authenticatedUserId);

  const page = parsePositiveInteger(query.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const filters = buildStudentFilters(query);

  const [students, total] = await Promise.all([
    User.find(filters)
      .select("-password -passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filters),
  ]);

  return {
    students: students.map(serializeStudent),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  listStudents,
};
