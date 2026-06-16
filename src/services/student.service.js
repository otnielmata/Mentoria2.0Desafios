const bcrypt = require("bcryptjs");
const AlunoTurma = require("../models/aluno-turma.model");
const Pontuacao = require("../models/pontuacao.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  parseObjectId,
  parseOptionalObjectId,
  parseOptionalText,
  parsePagination,
  parseRequiredText,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const ALLOWED_STUDENT_STATUSES = ["ativo", "inativo"];
const ACTIVE_CLASS_LINK_STATUS = "ativa";
const INACTIVE_CLASS_LINK_STATUS = "inativa";

function serializeStudent(user) {
  return {
    id: getEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    turmas: Array.isArray(user.turmas) ? user.turmas.map(getEntityId) : [],
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function assertAdmin(authenticatedUserId, message) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError(message, 403);
}

function parseStudentRole(value) {
  const role = normalizeText(value || STUDENT_ROLE);

  if (role !== STUDENT_ROLE) {
    throw createHttpError("role deve ser aluno para cadastro neste endpoint.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "role", message: "role deve ser aluno." }],
    });
  }

  return role;
}

function parseStudentStatus(value) {
  const status = normalizeText(value || ACTIVE_STATUS);

  if (!ALLOWED_STUDENT_STATUSES.includes(status)) {
    throw createHttpError("status deve ser ativo ou inativo.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "status", message: "status deve ser ativo ou inativo." }],
    });
  }

  return status;
}

async function assertTurmaExists(turmaId) {
  if (!turmaId) return null;

  const turma = await Turma.findById(turmaId);
  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  return turma;
}

async function syncStudentTurma(studentId, turmaId) {
  const normalizedTurmaId = turmaId || null;

  if (typeof AlunoTurma.updateMany === "function") {
    await AlunoTurma.updateMany(
      { aluno: studentId, status: ACTIVE_CLASS_LINK_STATUS },
      { status: INACTIVE_CLASS_LINK_STATUS, removedAt: new Date() }
    );
  }

  if (typeof Turma.updateMany === "function") {
    await Turma.updateMany({ alunos: studentId }, { $pull: { alunos: studentId } });
  }

  if (!normalizedTurmaId) {
    return [];
  }

  if (typeof AlunoTurma.findOneAndUpdate === "function") {
    await AlunoTurma.findOneAndUpdate(
      { aluno: studentId, turma: normalizedTurmaId },
      { aluno: studentId, turma: normalizedTurmaId, status: ACTIVE_CLASS_LINK_STATUS, removedAt: null },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else if (typeof AlunoTurma.create === "function") {
    await AlunoTurma.create({ aluno: studentId, turma: normalizedTurmaId, status: ACTIVE_CLASS_LINK_STATUS });
  }

  if (typeof Turma.updateOne === "function") {
    await Turma.updateOne({ _id: normalizedTurmaId }, { $addToSet: { alunos: studentId } });
  }

  return [normalizedTurmaId];
}

async function createStudent(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode cadastrar alunos.");

  const name = parseRequiredText(payload.name, "Nome");
  const email = parseRequiredText(payload.email, "E-mail").toLowerCase();
  const password = parseRequiredText(payload.password, "Senha");
  const role = parseStudentRole(payload.role || payload.perfil);
  const status = parseStudentStatus(payload.status || payload.situacao);
  const turmaId = parseOptionalObjectId(payload.turmaId || payload.turma_id || payload.turma, "Turma deve ser um identificador válido.");
  const turma = await assertTurmaExists(turmaId);

  const existingUser = await User.findOne({ email });
  if (existingUser) throw createHttpError("E-mail já está em uso.", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const student = await User.create({
    name,
    email,
    passwordHash,
    role,
    status,
    turmas: turma ? [turma._id || turma.id] : [],
  });

  if (turma) {
    await AlunoTurma.create({ aluno: student._id || student.id, turma: turma._id || turma.id, status: "ativa" });
    if (typeof Turma.updateOne === "function") {
      await Turma.updateOne({ _id: turma._id || turma.id }, { $addToSet: { alunos: student._id || student.id } });
    }
  }

  return serializeStudent(student);
}

async function listStudents(authenticatedUserId, query = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode listar alunos.");

  const filters = { role: STUDENT_ROLE };
  const andFilters = [];
  const status = parseOptionalText(query.status, "status");
  if (status) filters.status = status;

  const turmaId = parseOptionalObjectId(query.turmaId || query.turma_id || query.turma, "Turma deve ser um identificador válido.");
  if (turmaId) {
    const links = await AlunoTurma.find({ turma: turmaId, status: "ativa" }).lean();
    const alunoIds = (links || []).map((link) => getEntityId(link.aluno)).filter(Boolean);
    andFilters.push({ $or: [{ _id: { $in: alunoIds } }, { turmas: turmaId }] });
  }

  const search = parseOptionalText(query.search || query.q || query.texto, "Busca");
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    andFilters.push({ $or: [{ name: searchRegex }, { email: searchRegex }] });
  }

  if (andFilters.length > 0) filters.$and = andFilters;

  const { page, limit, skip } = parsePagination(query);
  const [total, students] = await Promise.all([
    User.countDocuments(filters),
    User.find(filters).sort({ name: 1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    pagination: buildPagination(total, page, limit),
    alunos: students.map(serializeStudent),
  };
}

async function getPontuacaoResumo(studentId) {
  const pontuacoes = await Pontuacao.find({ aluno: studentId }).lean();
  const totalPontos = (pontuacoes || []).reduce((total, pontuacao) => total + Number(pontuacao.pontos || 0), 0);
  const desafiosAprovados = new Set((pontuacoes || []).map((pontuacao) => getEntityId(pontuacao.envio)).filter(Boolean)).size;

  return {
    totalPontos,
    desafiosAprovados,
  };
}

async function getStudent(authenticatedUserId, studentId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode visualizar alunos.");
  const id = parseObjectId(studentId, "Aluno deve ser um identificador válido.");
  const student = await User.findOne({ _id: id, role: STUDENT_ROLE }).populate("turmas").lean();
  if (!student) throw createHttpError("Aluno não encontrado.", 404);
  return {
    ...serializeStudent(student),
    pontuacao: await getPontuacaoResumo(id),
  };
}

async function updateStudent(authenticatedUserId, studentId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode editar alunos.");
  const id = parseObjectId(studentId, "Aluno deve ser um identificador válido.");
  const student = await User.findOne({ _id: id, role: STUDENT_ROLE }).lean();
  if (!student) throw createHttpError("Aluno não encontrado.", 404);

  const updates = {};
  const name = parseOptionalText(payload.name || payload.nome, "Nome");
  if (name) updates.name = name;

  const email = parseOptionalText(payload.email, "E-mail");
  if (email) {
    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail !== student.email) {
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: id } }).lean();
      if (existingUser) throw createHttpError("E-mail já está em uso.", 409, { code: "EMAIL_ALREADY_IN_USE" });
    }
    updates.email = normalizedEmail;
  }

  const status = parseOptionalText(payload.status || payload.situacao, "Status");
  if (status) updates.status = parseStudentStatus(status);

  const password = parseOptionalText(payload.password || payload.senha || payload.newPassword || payload.novaSenha, "Senha");
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  const rawTurmaId = getFirstValue(payload, ["turmaId", "turma_id", "turma"]);
  if (rawTurmaId !== undefined) {
    const turmaId = parseOptionalObjectId(rawTurmaId, "Turma deve ser um identificador válido.");
    await assertTurmaExists(turmaId);
    updates.turmas = await syncStudentTurma(id, turmaId);
  }

  const updated = await User.findByIdAndUpdate(id, updates, { new: true }).lean();
  return serializeStudent(updated);
}

async function disableStudent(authenticatedUserId, studentId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode desativar alunos.");
  const id = parseObjectId(studentId, "Aluno deve ser um identificador válido.");
  const student = await User.findOneAndUpdate({ _id: id, role: STUDENT_ROLE }, { status: "inativo" }, { new: true }).lean();
  if (!student) throw createHttpError("Aluno não encontrado.", 404);
  return serializeStudent(student);
}

module.exports = {
  createStudent,
  disableStudent,
  getStudent,
  listStudents,
  updateStudent,
};
