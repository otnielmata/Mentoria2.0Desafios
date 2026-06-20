const AlunoTurma = require("../models/aluno-turma.model");
const Desafio = require("../models/desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const GrupoDesafio = require("../models/grupo-desafio.model");
const ParticipanteEnvio = require("../models/participante-envio.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const { logDomainEvent } = require("./audit.service");
const {
  assertObjectPayload,
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  hasOwn,
  normalizeText,
  parseObjectId,
  parseOptionalObjectId,
  parsePagination,
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

function serializeUser(user) {
  if (!user || typeof user !== "object") return user ? { id: getEntityId(user) } : null;
  return {
    id: getEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function serializePilar(pilar) {
  if (!pilar || typeof pilar !== "object") return pilar ? { id: getEntityId(pilar) } : null;
  return {
    id: getEntityId(pilar),
    name: pilar.name,
    description: pilar.description,
    status: pilar.status,
  };
}

function serializePilarPontuacao(item) {
  if (!item) return null;
  const pilar = item.pilar || item.pilarId || item.id;
  const points = Number(item.points || item.pontos || 0);
  return {
    pilar: serializePilar(pilar),
    pilarId: getEntityId(pilar),
    points,
    pontos: points,
  };
}

function getPilaresPontuacao(desafio) {
  const configured = Array.isArray(desafio.pilares) ? desafio.pilares.map(serializePilarPontuacao).filter((item) => item && item.pilarId) : [];
  if (configured.length > 0) return configured;
  if (!desafio.pilar) return [];
  const points = Number(desafio.points || 0);
  return Number.isFinite(points) && points > 0
    ? [{ pilar: serializePilar(desafio.pilar), pilarId: getEntityId(desafio.pilar), points, pontos: points }]
    : [];
}

function serializeTurma(turma) {
  if (!turma || typeof turma !== "object") return turma ? { id: getEntityId(turma) } : null;
  return {
    id: getEntityId(turma),
    name: turma.name,
    code: turma.code,
    description: turma.description,
    status: turma.status,
  };
}

function serializeDesafio(desafio) {
  if (!desafio || typeof desafio !== "object") return desafio ? { id: getEntityId(desafio) } : null;
  const pilares = getPilaresPontuacao(desafio);
  return {
    id: getEntityId(desafio),
    title: desafio.title,
    description: desafio.description,
    pilar: serializePilar(desafio.pilar),
    pilares,
    pontosPorPilar: pilares,
    points: desafio.points,
    difficulty: desafio.difficulty,
    type: desafio.type,
    maxParticipantes: desafio.maxParticipantes,
    deliveryDate: toIsoDate(desafio.deliveryDate),
    status: desafio.status,
  };
}

function serializeEnvio(envio, participantes = []) {
  const participantesSource = participantes.length > 0 ? participantes : envio.participantes || [];
  const participantesIds = participantesSource.map(getEntityId);
  const participantesDetalhes = participantesSource
    .filter((participante) => participante && typeof participante === "object")
    .map(serializeUser);

  return {
    id: getEntityId(envio),
    desafioId: getEntityId(envio.desafio),
    desafio: serializeDesafio(envio.desafio),
    pilar: serializePilar(envio.desafio && envio.desafio.pilar),
    turmaId: getEntityId(envio.turma),
    turma: serializeTurma(envio.turma),
    alunoId: getEntityId(envio.aluno),
    responsavelId: getEntityId(envio.aluno),
    liderId: getEntityId(envio.aluno),
    aluno: serializeUser(envio.aluno),
    responsavel: serializeUser(envio.aluno),
    lider: serializeUser(envio.aluno),
    description: envio.description,
    type: envio.type,
    evidencias: envio.evidencias,
    anexos: envio.anexos || [],
    grupoId: envio.grupo ? getEntityId(envio.grupo) : null,
    participantes: participantesIds,
    participantesDetalhes,
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
    return normalized;
  }

  if (typeof evidencias === "string" && evidencias.trim().length > 0) return [evidencias.trim()];
  return [];
}

function parseAnexos(payload) {
  const anexos = getFirstValue(payload, ["anexos", "attachments", "attachment", "anexo"]);

  if (Array.isArray(anexos)) {
    return anexos.filter(Boolean);
  }

  if (typeof anexos === "string" && anexos.trim().length > 0) return [anexos.trim()];
  if (anexos && typeof anexos === "object") return [anexos];
  return [];
}

function parseParticipantes(payload, type) {
  if (type !== GROUP_TYPE) return [];
  const participantes = getFirstValue(payload, ["participantes", "participants"]);
  if (!Array.isArray(participantes) || participantes.length === 0) throw createHttpError("Participantes são obrigatórios para envio em grupo.", 400);

  const parsed = participantes.map((participante) => parseObjectId(participante, "Participantes devem conter identificadores válidos."));
  if (new Set(parsed).size !== parsed.length) throw createHttpError("Participantes não podem conter duplicidades.", 400);
  if (parsed.length > 5) throw createHttpError("Grupo pode ter no máximo 5 participantes.", 400);
  return parsed;
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
  if (participantes.length > 5) {
    throw createHttpError("Grupo pode ter no máximo 5 participantes.", 400);
  }

  if (participantes.length > desafio.maxParticipantes) {
    throw createHttpError("Participantes excedem o limite permitido para este desafio.", 400);
  }
}

async function assertValidParticipants(participantes, responsibleId, turmaId) {
  if (participantes.includes(responsibleId)) throw createHttpError("Aluno responsável não deve ser incluído como participante.", 400);
  if (participantes.length === 0) return;

  const users = await User.find({ _id: { $in: participantes }, role: STUDENT_ROLE, status: ACTIVE_STATUS }).lean();
  if ((users || []).length !== participantes.length) throw createHttpError("Todos os participantes devem ser alunos ativos.", 400);

  const links = await AlunoTurma.find({
    turma: turmaId,
    aluno: { $in: participantes },
    status: "ativa",
  }).lean();
  const linkedStudentIds = new Set((links || []).map((link) => getEntityId(link.aluno)));
  if (linkedStudentIds.size !== participantes.length) {
    throw createHttpError("Participantes devem ser alunos ativos da mesma turma.", 400);
  }
}

async function syncParticipantes(envioId, participanteIds) {
  await ParticipanteEnvio.updateMany({ envio: envioId, status: "ativo" }, { status: "removido", removedAt: new Date() });

  if (participanteIds.length > 0) {
    await ParticipanteEnvio.create(participanteIds.map((alunoId) => ({ envio: envioId, aluno: alunoId, status: "ativo" })));
  }
}

async function getGroupForSubmission(grupoId, authenticatedUserId) {
  const id = parseObjectId(grupoId, "Grupo deve ser um identificador válido.");
  const grupo = await GrupoDesafio.findById(id)
    .populate({
      path: "desafio",
      populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
    })
    .populate("turma")
    .populate("participantes", "name email role status")
    .lean();

  if (!grupo) throw createHttpError("Grupo não encontrado.", 404);
  const participanteIds = (grupo.participantes || []).map(getEntityId);
  if (!participanteIds.includes(authenticatedUserId)) {
    throw createHttpError("Apenas participantes do grupo podem enviar este desafio.", 403);
  }

  const existingEnvio = await EnvioDesafio.findOne({
    grupo: id,
    status: { $ne: CANCELED_STATUS },
  }).lean();
  if (existingEnvio) {
    throw createHttpError("Este grupo já possui um envio registrado para o desafio.", 409, {
      code: "GROUP_SUBMISSION_ALREADY_EXISTS",
    });
  }

  const desafio = grupo.desafio;
  if (!desafio) throw createHttpError("Desafio do grupo não encontrado.", 404);
  if (normalizeText(desafio.status) !== ACTIVE_STATUS) throw createHttpError("Desafio deve estar ativo para receber envio.", 400);

  const deliveryDate = desafio.deliveryDate ? new Date(desafio.deliveryDate) : null;
  if (deliveryDate) deliveryDate.setUTCHours(23, 59, 59, 999);
  if (deliveryDate && deliveryDate < new Date()) {
    throw createHttpError("Prazo de entrega do desafio encerrado.", 400, { code: "CHALLENGE_DELIVERY_CLOSED" });
  }

  return grupo;
}

async function createEnvioFromGroup(authenticatedUserId, payload = {}, grupoId) {
  const student = await getAuthenticatedStudent(authenticatedUserId);
  const grupo = await getGroupForSubmission(grupoId, authenticatedUserId);
  const participantes = (grupo.participantes || []).map(getEntityId).filter((participanteId) => participanteId !== authenticatedUserId);
  const evidencias = parseEvidencias(payload);
  const anexos = parseAnexos(payload);
  const type = Number(grupo.maxParticipantes || 1) > 1 ? GROUP_TYPE : "individual";
  const turmaId = getEntityId(grupo.turma);
  const desafioId = getEntityId(grupo.desafio);
  const responsibleId = getEntityId(student);

  const envio = await EnvioDesafio.create({
    desafio: desafioId,
    turma: turmaId,
    aluno: responsibleId,
    description: parseRequiredText(payload.description || payload.descricao, "Descrição"),
    type,
    evidencias,
    anexos,
    participantes,
    grupo: getEntityId(grupo),
    status: PENDING_STATUS,
  });
  await syncParticipantes(envio._id || envio.id, participantes);
  await logDomainEvent({
    eventType: "envio_criado",
    actor: responsibleId,
    aluno: responsibleId,
    desafio: desafioId,
    envio: getEntityId(envio),
    turma: turmaId,
    statusNovo: PENDING_STATUS,
    metadata: {
      type,
      grupoId: getEntityId(grupo),
      participantes,
      anexos: anexos.map((anexo) => (anexo && anexo.name ? anexo.name : anexo)),
      statusInicial: PENDING_STATUS,
    },
    occurredAt: envio.createdAt || new Date(),
  });

  const envioObject = typeof envio.toObject === "function" ? envio.toObject() : envio;
  return serializeEnvio({ ...envioObject, grupo: getEntityId(grupo) }, participantes);
}

async function createEnvioDesafio(authenticatedUserId, payload = {}) {
  assertObjectPayload(payload);
  const grupoId = getFirstValue(payload, ["grupoId", "grupo_id", "grupo"]);
  if (grupoId) {
    return createEnvioFromGroup(authenticatedUserId, payload, grupoId);
  }

  const student = await getAuthenticatedStudent(authenticatedUserId);
  const type = parseSubmissionType(payload);
  const desafioId = parseObjectId(getFirstValue(payload, ["desafioId", "desafio_id", "desafio"]), "Desafio deve ser um identificador válido.");
  const turmaId = parseObjectId(getFirstValue(payload, ["turmaId", "turma_id", "turma"]), "Turma deve ser um identificador válido.");
  const participantes = parseParticipantes(payload, type);
  const evidencias = parseEvidencias(payload);
  const anexos = parseAnexos(payload);
  const [desafio] = await Promise.all([getActiveDesafio(desafioId), assertTurmaExists(turmaId)]);
  const responsibleId = getEntityId(student);

  assertChallengeAllowsSubmissionType(desafio, type);
  assertParticipantsLimit(participantes, desafio);
  await assertValidParticipants(participantes, responsibleId, turmaId);

  const envio = await EnvioDesafio.create({
    desafio: desafioId,
    turma: turmaId,
    aluno: responsibleId,
    description: parseRequiredText(payload.description || payload.descricao, "Descrição"),
    type,
    evidencias,
    anexos,
    participantes,
    status: PENDING_STATUS,
  });
  await syncParticipantes(envio._id || envio.id, participantes);
  await logDomainEvent({
    eventType: "envio_criado",
    actor: responsibleId,
    aluno: responsibleId,
    desafio: desafioId,
    envio: getEntityId(envio),
    turma: turmaId,
    statusNovo: PENDING_STATUS,
    metadata: {
      type,
      participantes,
      statusInicial: PENDING_STATUS,
    },
    occurredAt: envio.createdAt || new Date(),
  });

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
  const pilarId = parseOptionalObjectId(query.pilarId || query.pilar_id || query.pilar, "Pilar deve ser um identificador válido.");
  if (pilarId) {
    const desafios = await Desafio.find({ $or: [{ pilar: pilarId }, { "pilares.pilar": pilarId }] }).select("_id").lean();
    filters.desafio = { $in: (desafios || []).map(getEntityId) };
  }

  const { page, limit, skip } = parsePagination(query);
  const [total, envios] = await Promise.all([
    EnvioDesafio.countDocuments(filters),
    EnvioDesafio.find(filters)
      .populate({
        path: "desafio",
        populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
      })
      .populate("turma")
      .populate("aluno", "name email role status")
      .populate("participantes", "name email role status")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);
  return {
    total,
    pagination: buildPagination(total, page, limit),
    envios: envios.map((envio) => serializeEnvio(envio)),
  };
}

async function getEnvio(authenticatedUserId, envioId) {
  const id = parseObjectId(envioId, "Envio deve ser um identificador válido.");
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  const envio = await EnvioDesafio.findById(id)
    .populate({
      path: "desafio",
      populate: [{ path: "pilar" }, { path: "pilares.pilar" }],
    })
    .populate("turma")
    .populate("aluno", "name email role status")
    .populate("participantes", "name email role status")
    .lean();
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
  const isOwner = getEntityId(envio.aluno) === authenticatedUserId;
  const isParticipant = (envio.participantes || []).some((participante) => getEntityId(participante) === authenticatedUserId);
  if (!isOwner && !isParticipant) throw createHttpError("Apenas integrantes do grupo podem alterar este envio.", 403);
  if (!EDITABLE_STATUSES.includes(normalizeText(envio.status))) throw createHttpError("Somente envios pendentes ou em ajuste podem ser alterados.", 400);

  if (hasOwn(payload, "description") || hasOwn(payload, "descricao")) envio.description = parseRequiredText(payload.description || payload.descricao, "Descrição");
  const hasEvidenceField = ["evidencias", "evidences", "evidence", "evidencia_url"].some((field) => hasOwn(payload, field));
  if (hasEvidenceField) envio.evidencias = parseEvidencias(payload);
  const hasAttachmentField = ["anexos", "attachments", "attachment", "anexo"].some((field) => hasOwn(payload, field));
  if (hasAttachmentField) envio.anexos = parseAnexos(payload);
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
  await assertValidParticipants(participantes, authenticatedUserId, getEntityId(envio.turma));
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
  if (normalizeText(envio.status) !== PENDING_STATUS) throw createHttpError("Somente envios pendentes podem ser cancelados.", 400);
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
