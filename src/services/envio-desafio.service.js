const Desafio = require("../models/desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const ParticipanteEnvio = require("../models/participante-envio.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const {
  assertObjectPayload,
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  parseObjectId,
  parseOptionalObjectId,
  parsePeriod,
  parseRequiredText,
  toIsoDate,
} = require("./domain-utils");

const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const PENDING_STATUS = "pendente";
const ADJUST_STATUS = "ajuste";
const CANCELED_STATUS = "cancelado";
const GROUP_TYPE = "grupo";
const ALLOWED_SUBMISSION_TYPES = ["individual", "grupo"];
const EDITABLE_STATUSES = [PENDING_STATUS, ADJUST_STATUS];

function serializeEnvio(envio, participantes = []) {
  return {
    id: getEntityId(envio),
    desafioId: getEntityId(envio.desafio),
    turmaId: getEntityId(envio.turma),
    alunoId: getEntityId(envio.aluno),
    description: envio.description,
    type: envio.type,
    evidencias: envio.evidencias,
    participantes: participantes.length > 0 ? participantes.map(getEntityId) : (envio.participantes || []).map(getEntityId),
    status: envio.status,
    feedback: envio.feedback,
    approvedBy: envio.approvedBy ? getEntityId(envio.approvedBy) : null,
    approvedAt: toIsoDate(envio.approvedAt),
    createdAt: toIsoDate(envio.createdAt),
  };
}

async function getAuthenticatedStudent(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (normalizeText(user.role) !== STUDENT_ROLE) throw createHttpError("Apenas aluno pode registrar ou alterar envio de desafio.", 403);
  return user;
}

function parseSubmissionType(payload) {
  const type = normalizeText(getFirstValue(payload, ["type", "tipo", "tipoEnvio", "tipo_envio"]));
  if (!ALLOWED_SUBMISSION_TYPES.includes(type)) throw createHttpError("Tipo de envio deve ser individual ou grupo.", 400);
  return type;
}

function parseEvidencias(payload) {
  const evidencias = getFirstValue(payload, ["evidencias", "evidences", "evidence", "evidencia_url"]);

  if (Array.isArray(evidencias)) {
    const normalized = evidencias.map((item) => (typeof item === "string" ? item.trim() : item)).filter(Boolean);
    if (normalized.length === 0) throw createHttpError("Evidência é obrigatória.", 400);
    return normalized;
  }

  if (typeof evidencias === "string" && evidencias.trim().length > 0) return [evidencias.trim()];
  throw createHttpError("Evidência é obrigatória.", 400);
}

function parseParticipantes(payload, type) {
  if (type !== GROUP_TYPE) return [];
  const participantes = getFirstValue(payload, ["participantes", "participants"]);
  if (!Array.isArray(participantes) || participantes.length === 0) throw createHttpError("Participantes são obrigatórios para envio em grupo.", 400);

  return [...new Set(participantes.map((participante) => parseObjectId(participante, "Participantes devem conter identificadores válidos.")))];
}

async function getActiveDesafio(desafioId) {
  const desafio = await Desafio.findById(desafioId);
  if (!desafio) throw createHttpError("Desafio não encontrado.", 404);
  if (normalizeText(desafio.status) !== ACTIVE_STATUS) throw createHttpError("Desafio deve estar ativo para receber envio.", 400);
  return desafio;
}

async function assertTurmaExists(turmaId) {
  const turma = await Turma.findById(turmaId);
  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  return turma;
}

function assertChallengeAllowsSubmissionType(desafio, submissionType) {
  if (desafio.type !== "ambos" && desafio.type !== submissionType) {
    throw createHttpError("Tipo de envio não permitido para este desafio.", 400);
  }
}

function assertParticipantsLimit(participantes, desafio) {
  if (participantes.length > desafio.maxParticipantes) {
    throw createHttpError("Participantes excedem o limite permitido para este desafio.", 400);
  }
}

async function assertValidParticipants(participantes, responsibleId) {
  if (participantes.includes(responsibleId)) throw createHttpError("Aluno responsável não deve ser incluído como participante.", 400);
  if (participantes.length === 0) return;

  const users = await User.find({ _id: { $in: participantes }, role: STUDENT_ROLE, status: ACTIVE_STATUS }).lean();
  if ((users || []).length !== participantes.length) throw createHttpError("Todos os participantes devem ser alunos ativos.", 400);
}

async function syncParticipantes(envioId, participanteIds) {
  await ParticipanteEnvio.updateMany({ envio: envioId, status: "ativo" }, { status: "removido", removedAt: new Date() });

  if (participanteIds.length > 0) {
    await ParticipanteEnvio.create(participanteIds.map((alunoId) => ({ envio: envioId, aluno: alunoId, status: "ativo" })));
  }
}

async function createEnvioDesafio(authenticatedUserId, payload = {}) {
  assertObjectPayload(payload);
  const student = await getAuthenticatedStudent(authenticatedUserId);
  const type = parseSubmissionType(payload);
  const desafioId = parseObjectId(getFirstValue(payload, ["desafioId", "desafio_id", "desafio"]), "Desafio deve ser um identificador válido.");
  const turmaId = parseObjectId(getFirstValue(payload, ["turmaId", "turma_id", "turma"]), "Turma deve ser um identificador válido.");
  const participantes = parseParticipantes(payload, type);
  const [desafio] = await Promise.all([getActiveDesafio(desafioId), assertTurmaExists(turmaId)]);
  const responsibleId = getEntityId(student);

  assertChallengeAllowsSubmissionType(desafio, type);
  assertParticipantsLimit(participantes, desafio);
  await assertValidParticipants(participantes, responsibleId);

  const envio = await EnvioDesafio.create({
    desafio: desafioId,
    turma: turmaId,
    aluno: responsibleId,
    description: parseRequiredText(payload.description || payload.descricao, "Descrição"),
    type,
    evidencias: parseEvidencias(payload),
    participantes,
    status: PENDING_STATUS,
  });
  await syncParticipantes(envio._id || envio.id, participantes);

  return serializeEnvio(envio, participantes);
}

async function listMine(authenticatedUserId, query = {}) {
  await getAuthenticatedStudent(authenticatedUserId);
  const period = parsePeriod(query);
  const filters = {
    $or: [{ aluno: authenticatedUserId }, { participantes: authenticatedUserId }],
  };
  const status = query.status ? String(query.status).trim() : undefined;
  if (status) filters.status = status;
  if (period.createdAt) filters.createdAt = period.createdAt;
  const turmaId = parseOptionalObjectId(query.turmaId || query.turma_id || query.turma, "Turma deve ser um identificador válido.");
  if (turmaId) filters.turma = turmaId;
  const envios = await EnvioDesafio.find(filters).populate("desafio").populate("turma").sort({ createdAt: -1 }).lean();
  return { total: envios.length, envios: envios.map((envio) => serializeEnvio(envio)) };
}

async function getEnvio(authenticatedUserId, envioId) {
  const id = parseObjectId(envioId, "Envio deve ser um identificador válido.");
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  const envio = await EnvioDesafio.findById(id).populate("desafio").populate("turma").lean();
  if (!envio) throw createHttpError("Envio de desafio não encontrado.", 404);

  const isOwner = getEntityId(envio.aluno) === authenticatedUserId;
  const isParticipant = (envio.participantes || []).some((participante) => getEntityId(participante) === authenticatedUserId);
  const isReviewer = ["professor", "admin"].includes(normalizeText(user.role));
  if (!isOwner && !isParticipant && !isReviewer) throw createHttpError("Usuário não autorizado a visualizar este envio.", 403);
  return serializeEnvio(envio);
}

async function updateEnvio(authenticatedUserId, envioId, payload = {}) {
  await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(envioId, "Envio deve ser um identificador válido.");
  const envio = await EnvioDesafio.findById(id);
  if (!envio) throw createHttpError("Envio de desafio não encontrado.", 404);
  if (getEntityId(envio.aluno) !== authenticatedUserId) throw createHttpError("Apenas o aluno responsável pode alterar este envio.", 403);
  if (!EDITABLE_STATUSES.includes(normalizeText(envio.status))) throw createHttpError("Somente envios pendentes ou em ajuste podem ser alterados.", 400);

  if (payload.description || payload.descricao) envio.description = parseRequiredText(payload.description || payload.descricao, "Descrição");
  if (payload.evidencias || payload.evidences || payload.evidence || payload.evidencia_url) envio.evidencias = parseEvidencias(payload);
  const updated = await envio.save();
  return serializeEnvio(updated);
}

async function updateParticipantes(authenticatedUserId, envioId, payload = {}) {
  await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(envioId, "Envio deve ser um identificador válido.");
  const envio = await EnvioDesafio.findById(id).populate("desafio");
  if (!envio) throw createHttpError("Envio de desafio não encontrado.", 404);
  if (getEntityId(envio.aluno) !== authenticatedUserId) throw createHttpError("Apenas o aluno responsável pode gerenciar participantes deste envio.", 403);
  if (normalizeText(envio.type) !== GROUP_TYPE) throw createHttpError("Participantes só podem ser gerenciados em envio em grupo.", 400);
  if (!EDITABLE_STATUSES.includes(normalizeText(envio.status))) throw createHttpError("Somente envios pendentes ou em ajuste podem ser alterados.", 400);

  const participantes = parseParticipantes(payload, GROUP_TYPE);
  assertParticipantsLimit(participantes, envio.desafio);
  await assertValidParticipants(participantes, authenticatedUserId);
  envio.participantes = participantes;
  const updated = await envio.save();
  await syncParticipantes(id, participantes);
  return serializeEnvio(updated, participantes);
}

async function cancelEnvio(authenticatedUserId, envioId) {
  await getAuthenticatedStudent(authenticatedUserId);
  const id = parseObjectId(envioId, "Envio deve ser um identificador válido.");
  const envio = await EnvioDesafio.findById(id);
  if (!envio) throw createHttpError("Envio de desafio não encontrado.", 404);
  if (getEntityId(envio.aluno) !== authenticatedUserId) throw createHttpError("Apenas o aluno responsável pode cancelar este envio.", 403);
  if (!EDITABLE_STATUSES.includes(normalizeText(envio.status))) throw createHttpError("Somente envios pendentes ou em ajuste podem ser cancelados.", 400);
  envio.status = CANCELED_STATUS;
  envio.canceledAt = new Date();
  const updated = await envio.save();
  return serializeEnvio(updated);
}

module.exports = {
  cancelEnvio,
  createEnvioDesafio,
  getEnvio,
  listMine,
  updateEnvio,
  updateParticipantes,
};
