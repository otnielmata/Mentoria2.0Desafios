const AlunoTurma = require("../models/aluno-turma.model");
const Desafio = require("../models/desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const GrupoDesafio = require("../models/grupo-desafio.model");
const ParticipanteEnvio = require("../models/participante-envio.model");
const Pilar = require("../models/pilar.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const { logDomainEvent } = require("./audit.service");
const { getEffectiveChallengeStatus, inactivateExpiredChallenges } = require("./desafio-prazo.service");
const {
  assertObjectPayload,
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  hasOwn,
  normalizeText,
  parseObjectId,
  parseBoundedText,
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
const COMPLETE_GROUP_STATUS = "completo";
const GROUP_TYPE = "grupo";
const ALLOWED_SUBMISSION_TYPES = ["individual", "grupo"];
const EDITABLE_STATUSES = [PENDING_STATUS, ADJUST_STATUS, "reprovado"];
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_EVIDENCE_LENGTH = 2048;

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
    status: getEffectiveChallengeStatus(desafio),
  };
}

function serializeEnvio(envio, participantes = []) {
  const participantesSource = participantes.length > 0 ? participantes : envio.participantes || [];
  const participantesIds = participantesSource.map(getEntityId);
  const participantCountIds = new Set([getEntityId(envio.aluno), ...participantesIds].filter(Boolean));
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
    totalParticipantes: participantCountIds.size,
    quantidadeParticipantes: participantCountIds.size,
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
  if (normalizeText(user.status || ACTIVE_STATUS) !== ACTIVE_STATUS) {
    throw createHttpError("Aluno inativo não pode registrar ou alterar envio de desafio.", 403, { code: "INACTIVE_USER" });
  }
  return user;
}

function parseSubmissionType(payload) {
  const type = normalizeText(getFirstValue(payload, ["type", "tipo", "tipoEnvio", "tipo_envio"]));
  if (!ALLOWED_SUBMISSION_TYPES.includes(type)) throw createHttpError("Tipo de envio deve ser individual ou grupo.", 400);
  return type;
}

function parseEvidencias(payload) {
  const evidencias = getFirstValue(payload, ["evidencias", "evidences", "evidence", "evidencia_url"]);
  const values = Array.isArray(evidencias) ? evidencias : typeof evidencias === "string" && evidencias.trim() ? [evidencias.trim()] : [];
  return values
    .map((item) => {
      if (typeof item !== "string") return item;
      const value = item.trim();
      if (value.length > MAX_EVIDENCE_LENGTH) throw createHttpError("Cada evidência deve ter no máximo 2048 caracteres.", 400);
      if (/^(https?:\/\/|www\.)/i.test(value)) {
        try {
          const url = new URL(/^www\./i.test(value) ? `https://${value}` : value);
          if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
        } catch {
          throw createHttpError("A evidência deve conter um link válido.", 400);
        }
      }
      return value;
    })
    .filter(Boolean);
}

function parseAnexos(payload) {
  const anexos = getFirstValue(payload, ["anexos", "attachments", "attachment", "anexo"]);

  if (Array.isArray(anexos)) {
    return anexos.filter(Boolean).map(validateAttachment);
  }

  if (typeof anexos === "string" && anexos.trim().length > 0) return [anexos.trim()];
  if (anexos && typeof anexos === "object") return [validateAttachment(anexos)];
  return [];
}

function validateAttachment(attachment) {
  if (!attachment || typeof attachment !== "object") throw createHttpError("Anexo inválido.", 400);
  const size = Number(attachment.size);
  if (!Number.isFinite(size) || size <= 0) throw createHttpError("O anexo não pode estar vazio.", 400, { code: "EMPTY_ATTACHMENT" });
  if (size > MAX_ATTACHMENT_SIZE_BYTES) throw createHttpError("Cada anexo deve ter no máximo 10 MB.", 413, { code: "ATTACHMENT_TOO_LARGE" });
  const content = attachment.content || attachment.data || attachment.dataUrl || attachment.dataURL;
  if (typeof content !== "string" || content.trim().length === 0) throw createHttpError("Não foi possível ler o conteúdo do anexo.", 400);
  return attachment;
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
  const pilarIds = [desafio.pilar, ...(desafio.pilares || []).map((item) => item && item.pilar)].filter(Boolean);
  if (pilarIds.length > 0 && typeof Pilar.find === "function") {
    const pilares = await Pilar.find({ _id: { $in: pilarIds }, status: ACTIVE_STATUS }).select("_id").lean();
    if ((pilares || []).length !== new Set(pilarIds.map(getEntityId)).size) throw createHttpError("O desafio possui pilar inativo e não aceita novos envios.", 400);
  }
  return desafio;
}

async function assertTurmaExists(turmaId) {
  const turma = await Turma.findById(turmaId);
  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  if (turma.status && normalizeText(turma.status) !== "ativa") throw createHttpError("Turma deve estar ativa para receber envios.", 400);
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
  if (grupo.turma && normalizeText(grupo.turma.status || ACTIVE_STATUS) !== "ativa") {
    throw createHttpError("A turma do grupo está encerrada e não recebe envios.", 400, { code: "INACTIVE_TURMA" });
  }
  const pilarRefs = [desafio.pilar, ...(Array.isArray(desafio.pilares) ? desafio.pilares.map((item) => item && item.pilar) : [])].filter(Boolean);
  if (pilarRefs.some((pilar) => normalizeText(pilar.status || ACTIVE_STATUS) !== ACTIVE_STATUS)) {
    throw createHttpError("O desafio está vinculado a um pilar inativo.", 400, { code: "INACTIVE_PILAR" });
  }
  if ((grupo.participantes || []).some((participante) => normalizeText(participante.status || ACTIVE_STATUS) !== ACTIVE_STATUS)) {
    throw createHttpError("Todos os participantes do grupo precisam estar ativos.", 400, { code: "INACTIVE_USER" });
  }

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
    description: parseBoundedText(payload.description || payload.descricao, "Descrição", 4000),
    type,
    evidencias,
    anexos,
    participantes,
    grupo: getEntityId(grupo),
    status: PENDING_STATUS,
  });
  await syncParticipantes(envio._id || envio.id, participantes);
  if (typeof GrupoDesafio.updateOne === "function") {
    await GrupoDesafio.updateOne({ _id: getEntityId(grupo) }, { $set: { status: COMPLETE_GROUP_STATUS } });
  }
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
    description: parseBoundedText(payload.description || payload.descricao, "Descrição", 4000),
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
  await inactivateExpiredChallenges();
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

async function assertSubmissionChallengeActive(envio) {
  await inactivateExpiredChallenges();
  const embeddedDesafio = envio && envio.desafio && typeof envio.desafio === "object" && envio.desafio.status ? envio.desafio : null;
  const desafio = embeddedDesafio || (await Desafio.findById(getEntityId(envio && envio.desafio)));
  if (!desafio) throw createHttpError("Desafio do envio não encontrado.", 404);
  if (normalizeText(getEffectiveChallengeStatus(desafio)) !== ACTIVE_STATUS) {
    throw createHttpError("Envios de desafios inativos não podem ser editados.", 400, {
      code: "INACTIVE_CHALLENGE_EDIT_BLOCKED",
    });
  }
  return desafio;
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
  if (!EDITABLE_STATUSES.includes(normalizeText(envio.status))) throw createHttpError("Somente envios pendentes, em ajuste ou reprovados podem ser reenviados.", 400);
  await assertSubmissionChallengeActive(envio);

  if (hasOwn(payload, "description") || hasOwn(payload, "descricao")) envio.description = parseRequiredText(payload.description || payload.descricao, "Descrição");
  const hasEvidenceField = ["evidencias", "evidences", "evidence", "evidencia_url"].some((field) => hasOwn(payload, field));
  if (hasEvidenceField) envio.evidencias = parseEvidencias(payload);
  const hasAttachmentField = ["anexos", "attachments", "attachment", "anexo"].some((field) => hasOwn(payload, field));
  if (hasAttachmentField) envio.anexos = parseAnexos(payload);
  if (normalizeText(envio.status) === "reprovado") {
    envio.status = PENDING_STATUS;
    envio.feedback = null;
    envio.avaliacao = null;
    envio.evaluatedBy = null;
    envio.evaluatedAt = null;
  }
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
  if (!EDITABLE_STATUSES.includes(normalizeText(envio.status))) throw createHttpError("Somente envios pendentes, em ajuste ou reprovados podem ser alterados.", 400);
  await assertSubmissionChallengeActive(envio);

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
