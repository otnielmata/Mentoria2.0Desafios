const AlunoTurma = require("../models/aluno-turma.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  normalizeText,
  parseObjectId,
  parseOptionalText,
  parsePagination,
  parseRequiredText,
  toIsoDate,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_TURMA_STATUS = "ativa";
const CLOSED_STATUS = "encerrada";

function serializeTurma(turma, alunos = []) {
  const startDate = toIsoDate(turma.startDate);
  const endDate = toIsoDate(turma.endDate);

  return {
    id: getEntityId(turma),
    name: turma.name,
    nome: turma.name,
    code: turma.code,
    description: turma.description,
    startDate,
    endDate,
    data_inicio: startDate,
    data_fim: endDate,
    status: turma.status,
    quantidadeAlunos: alunos.length || (Array.isArray(turma.alunos) ? turma.alunos.length : 0),
    alunos: alunos.map((aluno) => ({
      id: getEntityId(aluno),
      name: aluno.name,
      email: aluno.email,
      status: aluno.status,
    })),
  };
}

async function assertAdmin(authenticatedUserId, message) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError(message, 403);
}

function parseDateField(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw createHttpError(`${fieldName} deve ser uma data válida.`, 400);
  return date;
}

function assertValidPeriod(startDate, endDate) {
  if (startDate && endDate && startDate > endDate) {
    throw createHttpError("data_inicio não pode ser posterior à data_fim.", 400);
  }
}

async function createTurma(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode cadastrar turmas.");
  const startDate = parseDateField(payload.startDate || payload.data_inicio, "data_inicio");
  const endDate = parseDateField(payload.endDate || payload.data_fim, "data_fim");
  assertValidPeriod(startDate, endDate);

  const turma = await Turma.create({
    name: parseRequiredText(payload.name || payload.nome, "Nome"),
    code: parseOptionalText(payload.code || payload.codigo, "Código") || null,
    description: parseOptionalText(payload.description || payload.descricao, "Descrição") || null,
    startDate,
    endDate,
    status: payload.status || ACTIVE_TURMA_STATUS,
  });

  return serializeTurma(turma);
}

async function listTurmas(authenticatedUserId, query = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode listar turmas.");
  const filters = {};
  if (query.status) filters.status = String(query.status).trim();
  const { page, limit, skip } = parsePagination(query);
  const [total, turmas] = await Promise.all([
    Turma.countDocuments(filters),
    Turma.find(filters).sort({ name: 1 }).skip(skip).limit(limit).lean(),
  ]);
  return {
    total,
    pagination: buildPagination(total, page, limit),
    turmas: turmas.map((turma) => serializeTurma(turma)),
  };
}

async function getTurma(authenticatedUserId, turmaId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode visualizar turmas.");
  const id = parseObjectId(turmaId, "Turma deve ser um identificador válido.");
  const turma = await Turma.findById(id).lean();
  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  const links = await AlunoTurma.find({ turma: id, status: "ativa" }).populate("aluno").lean();
  const alunos = (links || []).map((link) => link.aluno).filter(Boolean);
  return serializeTurma(turma, alunos);
}

async function updateTurma(authenticatedUserId, turmaId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode editar turmas.");
  const id = parseObjectId(turmaId, "Turma deve ser um identificador válido.");
  const updates = {};
  if (payload.name || payload.nome) updates.name = parseRequiredText(payload.name || payload.nome, "Nome");
  if (payload.code !== undefined || payload.codigo !== undefined) updates.code = parseOptionalText(payload.code || payload.codigo, "Código") || null;
  if (payload.description !== undefined || payload.descricao !== undefined) {
    updates.description = parseOptionalText(payload.description || payload.descricao, "Descrição") || null;
  }
  if (payload.status) updates.status = parseRequiredText(payload.status, "Status");
  if (payload.startDate || payload.data_inicio) updates.startDate = parseDateField(payload.startDate || payload.data_inicio, "data_inicio");
  if (payload.endDate || payload.data_fim) updates.endDate = parseDateField(payload.endDate || payload.data_fim, "data_fim");

  const current = await Turma.findById(id).lean();
  if (!current) throw createHttpError("Turma não encontrada.", 404);
  assertValidPeriod(
    Object.prototype.hasOwnProperty.call(updates, "startDate") ? updates.startDate : current.startDate,
    Object.prototype.hasOwnProperty.call(updates, "endDate") ? updates.endDate : current.endDate
  );

  const turma = await Turma.findByIdAndUpdate(id, updates, { new: true }).lean();
  return serializeTurma(turma);
}

async function closeTurma(authenticatedUserId, turmaId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode encerrar turmas.");
  const id = parseObjectId(turmaId, "Turma deve ser um identificador válido.");
  const turma = await Turma.findByIdAndUpdate(id, { status: CLOSED_STATUS, endDate: new Date() }, { new: true }).lean();
  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  return serializeTurma(turma);
}

async function enrollStudent(authenticatedUserId, turmaId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode matricular alunos em turmas.");
  const id = parseObjectId(turmaId, "Turma deve ser um identificador válido.");
  const studentId = parseObjectId(payload.studentId || payload.alunoId, "Aluno deve ser um identificador válido.");
  const [turma, student] = await Promise.all([
    Turma.findById(id),
    User.findOne({ _id: studentId, role: STUDENT_ROLE }),
  ]);

  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  if (normalizeText(turma.status) !== ACTIVE_TURMA_STATUS) throw createHttpError("Turma deve estar ativa para matrícula.", 400);
  if (!student) throw createHttpError("Aluno não encontrado.", 404);
  if (normalizeText(student.status) !== "ativo") throw createHttpError("Aluno deve estar ativo para matrícula.", 400);

  const existing = await AlunoTurma.findOne({ aluno: studentId, turma: id, status: "ativa" });
  if (existing) throw createHttpError("Aluno já matriculado nesta turma.", 409);

  await AlunoTurma.create({ aluno: studentId, turma: id, status: "ativa" });
  await Promise.all([
    User.updateOne({ _id: studentId }, { $addToSet: { turmas: id } }),
    Turma.updateOne({ _id: id }, { $addToSet: { alunos: studentId } }),
  ]);

  return { id: `${id}:${studentId}`, turmaId: id, studentId, status: "ativa" };
}

async function removeStudent(authenticatedUserId, turmaId, alunoId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode remover alunos de turmas.");
  const id = parseObjectId(turmaId, "Turma deve ser um identificador válido.");
  const studentId = parseObjectId(alunoId, "Aluno deve ser um identificador válido.");
  const link = await AlunoTurma.findOneAndUpdate(
    { aluno: studentId, turma: id, status: "ativa" },
    { status: "removida", removedAt: new Date() },
    { new: true }
  ).lean();
  await Promise.all([
    User.updateOne({ _id: studentId }, { $pull: { turmas: id } }),
    Turma.updateOne({ _id: id }, { $pull: { alunos: studentId } }),
  ]);
  return { id: `${id}:${studentId}`, turmaId: id, studentId, status: link ? "removida" : "ausente" };
}

module.exports = {
  closeTurma,
  createTurma,
  enrollStudent,
  getTurma,
  listTurmas,
  removeStudent,
  updateTurma,
};
