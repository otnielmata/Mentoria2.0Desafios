const bcrypt = require("bcryptjs");
const AlunoTurma = require("../models/aluno-turma.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const {
  createHttpError,
  getEntityId,
  normalizeText,
  parseObjectId,
  parseOptionalObjectId,
  parseOptionalText,
  parseRequiredText,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";

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

async function assertAdmin(authenticatedUserId, message) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError(message, 403);
}

async function assertTurmaExists(turmaId) {
  if (!turmaId) return null;

  const turma = await Turma.findById(turmaId);
  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  return turma;
}

async function createStudent(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode cadastrar alunos.");

  const name = parseRequiredText(payload.name, "Nome");
  const email = parseRequiredText(payload.email, "E-mail").toLowerCase();
  const password = parseRequiredText(payload.password, "Senha");
  const turmaId = parseOptionalObjectId(payload.turmaId || payload.turma_id || payload.turma, "Turma deve ser um identificador válido.");
  const turma = await assertTurmaExists(turmaId);

  const existingUser = await User.findOne({ email });
  if (existingUser) throw createHttpError("E-mail já está em uso.", 409);

  const passwordHash = await bcrypt.hash(password, 10);
  const student = await User.create({
    name,
    email,
    passwordHash,
    role: STUDENT_ROLE,
    status: ACTIVE_STATUS,
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
  const status = parseOptionalText(query.status, "status");
  if (status) filters.status = status;

  const turmaId = parseOptionalObjectId(query.turmaId || query.turma_id || query.turma, "Turma deve ser um identificador válido.");
  if (turmaId) {
    const links = await AlunoTurma.find({ turma: turmaId, status: "ativa" }).lean();
    const alunoIds = (links || []).map((link) => getEntityId(link.aluno)).filter(Boolean);
    filters.$or = [{ _id: { $in: alunoIds } }, { turmas: turmaId }];
  }

  const students = await User.find(filters).sort({ name: 1 }).lean();
  return {
    total: students.length,
    alunos: students.map(serializeStudent),
  };
}

async function getStudent(authenticatedUserId, studentId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode visualizar alunos.");
  const id = parseObjectId(studentId, "Aluno deve ser um identificador válido.");
  const student = await User.findOne({ _id: id, role: STUDENT_ROLE }).populate("turmas").lean();
  if (!student) throw createHttpError("Aluno não encontrado.", 404);
  return serializeStudent(student);
}

module.exports = {
  createStudent,
  getStudent,
  listStudents,
};
