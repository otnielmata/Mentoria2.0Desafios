const Desafio = require("../models/desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
require("../models/grupo-desafio.model");
const ParticipanteEnvio = require("../models/participante-envio.model");
const User = require("../models/user.model");
const { logDomainEvent } = require("./audit.service");
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
  parsePeriod,
  toIsoDate,
} = require("./domain-utils");
const {
  assertNoDuplicateEvidenceScore,
  assertRecurringScoreLimit,
  generatePontuacoesForApprovedEnvio,
  getChallengeBasePoints,
  getLivePresentationBonusPoints,
  getScoreRecipients,
} = require("./pontuacao.service");

const REVIEWER_ROLES = ["professor", "admin"];
const ALLOWED_DECISIONS = ["aprovado", "reprovado", "ajuste"];
const FEEDBACK_REQUIRED_DECISIONS = ["reprovado", "ajuste"];
const APPROVED_STATUS = "aprovado";
const PENDING_STATUS = "pendente";
const CANCELED_STATUS = "cancelado";
const LISTABLE_STATUSES = ["pendente", "aprovado", "reprovado", "ajuste", "cancelado"];

async function getReviewer(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!REVIEWER_ROLES.includes(normalizeText(user.role))) throw createHttpError("Apenas professor ou admin pode avaliar envios.", 403);
  return user;
}

function parseEvaluationPayload(payload = {}) {
  const decision = normalizeText(getFirstValue(payload, ["decision", "decisao", "status", "resultado"]));
  if (!ALLOWED_DECISIONS.includes(decision)) throw createHttpError("Decisão deve ser aprovado, reprovado ou ajuste.", 400);
  const feedback = getFirstValue(payload, ["feedback", "comentario", "comentário", "observacao", "observação"]);
  const apresentacaoAoVivo = parseBoolean(
    getFirstValue(payload, ["apresentacaoAoVivo", "apresentouAoVivo", "livePresentation", "apresentacao_ao_vivo"]),
    "apresentacaoAoVivo"
  );
  if (FEEDBACK_REQUIRED_DECISIONS.includes(decision) && (!feedback || typeof feedback !== "string" || feedback.trim().length === 0)) {
    throw createHttpError("Feedback é obrigatório para reprovar ou solicitar ajuste.", 400);
  }

  return {
    decision,
    feedback: typeof feedback === "string" ? feedback.trim() : null,
    apresentacaoAoVivo,
    avaliacao: {
      decision,
      feedback: typeof feedback === "string" ? feedback.trim() : null,
      apresentacaoAoVivo,
    },
  };
}

function parseBoolean(value, fieldName) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "boolean") return value;
  if (["true", "1", "sim", "s", "yes", "y"].includes(normalizeText(value))) return true;
  if (["false", "0", "nao", "não", "n", "no"].includes(normalizeText(value))) return false;
  throw createHttpError(`${fieldName} deve ser verdadeiro ou falso.`, 400);
}

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

function serializeTurma(turma) {
  if (!turma || typeof turma !== "object") return turma ? { id: getEntityId(turma) } : null;
  return {
    id: getEntityId(turma),
    name: turma.name,
    code: turma.code,
    status: turma.status,
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
  const points = Number(desafio.points || 0);
  return desafio.pilar && points > 0 ? [{ pilar: serializePilar(desafio.pilar), pilarId: getEntityId(desafio.pilar), points, pontos: points }] : [];
}

function serializeDesafio(desafio) {
  if (!desafio || typeof desafio !== "object") return desafio ? { id: getEntityId(desafio) } : null;
  const pilares = getPilaresPontuacao(desafio);
  return {
    id: getEntityId(desafio),
    title: desafio.title,
    description: desafio.description,
    points: desafio.points,
    pontos: desafio.points,
    pilares,
    pontosPorPilar: pilares,
    livePresentationPoints: Number(desafio.livePresentationPoints || 0),
    type: desafio.type,
    difficulty: desafio.difficulty,
    pilar: serializePilar(desafio.pilar),
  };
}

function getRelatedParticipants(envio, relationalParticipants = []) {
  const ownerId = getEntityId(envio && envio.aluno);
  const participantsById = new Map();
  const candidates = [
    ...(envio && Array.isArray(envio.participantes) ? envio.participantes : []),
    ...relationalParticipants,
    ...(envio && envio.grupo && Array.isArray(envio.grupo.participantes) ? envio.grupo.participantes : []),
  ];

  candidates.forEach((candidate) => {
    const participant = candidate && candidate.aluno ? candidate.aluno : candidate;
    const participantId = getEntityId(participant);
    if (!participantId || participantId === ownerId || participantsById.has(participantId)) return;
    participantsById.set(participantId, participant);
  });

  return Array.from(participantsById.values());
}

function serializeEnvio(envio, relationalParticipants = []) {
  const participantes = getRelatedParticipants(envio, relationalParticipants);
  return {
    id: getEntityId(envio),
    desafioId: getEntityId(envio.desafio),
    desafio: serializeDesafio(envio.desafio),
    turmaId: getEntityId(envio.turma),
    turma: serializeTurma(envio.turma),
    alunoId: getEntityId(envio.aluno),
    aluno: serializeUser(envio.aluno),
    description: envio.description,
    type: envio.type,
    evidencias: envio.evidencias,
    anexos: envio.anexos || [],
    participantes: participantes.map((participante) =>
      typeof participante === "object" ? serializeUser(participante) : { id: getEntityId(participante) }
    ),
    totalParticipantes: new Set([getEntityId(envio.aluno), ...participantes.map(getEntityId)].filter(Boolean)).size,
    status: envio.status,
    feedback: envio.feedback,
    avaliacao: envio.avaliacao || null,
    evaluatedBy: envio.evaluatedBy ? getEntityId(envio.evaluatedBy) : null,
    evaluatedAt: toIsoDate(envio.evaluatedAt),
    approvedBy: envio.approvedBy ? getEntityId(envio.approvedBy) : null,
    approvedAt: toIsoDate(envio.approvedAt),
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseListStatus(query = {}) {
  const rawStatus = parseOptionalText(query.status || query.situacao, "Status");
  if (!rawStatus) return PENDING_STATUS;

  const status = normalizeText(rawStatus);
  if (["todos", "all"].includes(status)) return null;
  if (!LISTABLE_STATUSES.includes(status)) throw createHttpError("Status deve ser pendente, aprovado, reprovado, ajuste, cancelado ou todos.", 400);
  return status;
}

async function listPending(authenticatedUserId, query = {}) {
  await getReviewer(authenticatedUserId);
  const period = parsePeriod(query);
  const filters = {};
  const status = parseListStatus(query);
  if (status) filters.status = status;
  if (period.createdAt) filters.createdAt = period.createdAt;
  const turmaId = parseOptionalObjectId(query.turmaId || query.turma_id || query.turma, "Turma deve ser um identificador válido.");
  if (turmaId) filters.turma = turmaId;

  const desafioId = parseOptionalObjectId(query.desafioId || query.desafio_id || query.desafio, "Desafio deve ser um identificador válido.");
  const pilarId = parseOptionalObjectId(query.pilarId || query.pilar_id || query.pilar, "Pilar deve ser um identificador válido.");
  if (pilarId) {
    const desafios = await Desafio.find({ $or: [{ pilar: pilarId }, { "pilares.pilar": pilarId }] }).select("_id").lean();
    const desafioIds = (desafios || []).map(getEntityId);
    filters.desafio = desafioId ? (desafioIds.includes(desafioId) ? desafioId : { $in: [] }) : { $in: desafioIds };
  } else if (desafioId) {
    filters.desafio = desafioId;
  }

  const alunoId = parseOptionalObjectId(query.alunoId || query.aluno_id || query.aluno, "Aluno deve ser um identificador válido.");
  if (alunoId) filters.$or = [{ aluno: alunoId }, { participantes: alunoId }];

  const search = parseOptionalText(query.search || query.q || query.nome || query.name, "Busca");
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    const [users, desafiosPorTitulo] = await Promise.all([
      User.find({ name: searchRegex }).select("_id").lean(),
      Desafio.find({ title: searchRegex }).select("_id").lean(),
    ]);
    const userIds = (users || []).map(getEntityId).filter(Boolean);
    const desafioIds = (desafiosPorTitulo || []).map(getEntityId).filter(Boolean);
    const searchFilters = [];
    if (userIds.length > 0) searchFilters.push({ aluno: { $in: userIds } }, { participantes: { $in: userIds } });
    if (desafioIds.length > 0) searchFilters.push({ desafio: { $in: desafioIds } });
    filters.$and = [...(filters.$and || []), { $or: searchFilters.length > 0 ? searchFilters : [{ _id: { $in: [] } }] }];
  }

  const { page, limit, skip } = parsePagination(query);
  const sortDirection = ["desc", "recentes", "-createdAt"].includes(String(query.sort || query.ordenacao || "").trim()) ? -1 : 1;
  const [total, envios] = await Promise.all([
    EnvioDesafio.countDocuments(filters),
    EnvioDesafio.find(filters)
      .populate("aluno", "name email role status")
      .populate("participantes", "name email role status")
      .populate({
        path: "grupo",
        populate: { path: "participantes", select: "name email role status" },
      })
      .populate("turma", "name code status")
      .populate({
        path: "desafio",
        select: "title description points livePresentationPoints difficulty type pilar pilares",
        populate: [
          { path: "pilar", select: "name description status" },
          { path: "pilares.pilar", select: "name description status" },
        ],
      })
      .sort({ createdAt: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);
  const envioIds = envios.map(getEntityId).filter(Boolean);
  const relationalLinks =
    envioIds.length > 0
      ? await ParticipanteEnvio.find({ envio: { $in: envioIds }, status: "ativo" }).populate("aluno", "name email role status").lean()
      : [];
  const participantsByEnvio = new Map();
  relationalLinks.forEach((link) => {
    const envioId = getEntityId(link.envio);
    if (!envioId) return;
    participantsByEnvio.set(envioId, [...(participantsByEnvio.get(envioId) || []), link.aluno]);
  });

  return {
    total,
    pagination: buildPagination(total, page, limit),
    envios: envios.map((envio) => serializeEnvio(envio, participantsByEnvio.get(getEntityId(envio)) || [])),
  };
}

function applyEvaluation(envio, reviewer, parsedEvaluation) {
  const evaluatedAt = new Date();
  envio.status = parsedEvaluation.decision;
  envio.feedback = parsedEvaluation.feedback;
  envio.avaliacao = parsedEvaluation.avaliacao;
  envio.evaluatedBy = reviewer._id || reviewer.id;
  envio.evaluatedAt = evaluatedAt;
  envio.approvedBy = parsedEvaluation.decision === APPROVED_STATUS ? reviewer._id || reviewer.id : null;
  envio.approvedAt = parsedEvaluation.decision === APPROVED_STATUS ? evaluatedAt : null;
}

async function getDesafioForEnvio(envio) {
  if (envio.desafio && typeof envio.desafio === "object" && envio.desafio.points !== undefined) return envio.desafio;
  const desafio = await Desafio.findById(getEntityId(envio.desafio));
  if (!desafio) throw createHttpError("Desafio do envio não encontrado.", 404);
  return desafio;
}

async function logEvaluationEvent(envio, reviewer, previousStatus, parsedEvaluation) {
  await logDomainEvent({
    eventType: "envio_avaliado",
    actor: reviewer._id || reviewer.id,
    aluno: getEntityId(envio.aluno),
    desafio: getEntityId(envio.desafio),
    envio: getEntityId(envio),
    turma: getEntityId(envio.turma),
    statusAnterior: previousStatus,
    statusNovo: parsedEvaluation.decision,
    feedback: parsedEvaluation.feedback,
    metadata: {
      decision: parsedEvaluation.decision,
      feedback: parsedEvaluation.feedback,
      apresentacaoAoVivo: parsedEvaluation.apresentacaoAoVivo,
      evaluatedAt: toIsoDate(envio.evaluatedAt),
    },
    occurredAt: envio.evaluatedAt || new Date(),
  });
}

async function evaluateEnvio(authenticatedUserId, envioId, payload = {}) {
  const id = parseObjectId(envioId, "Envio deve ser um identificador válido.");
  const parsedEvaluation = parseEvaluationPayload(payload);
  const reviewer = await getReviewer(authenticatedUserId);
  const envio = await EnvioDesafio.findById(id);
  if (!envio) throw createHttpError("Envio de desafio não encontrado.", 404);

  const currentStatus = normalizeText(envio.status);
  if (currentStatus === CANCELED_STATUS) throw createHttpError("Envios cancelados não podem ser avaliados.", 400);
  if (currentStatus === APPROVED_STATUS) {
    throw createHttpError("Envios aprovados não podem receber nova decisão.", 400);
  }

  if (parsedEvaluation.decision !== APPROVED_STATUS) {
    applyEvaluation(envio, reviewer, parsedEvaluation);
    const updated = await envio.save();
    await logEvaluationEvent(updated, reviewer, currentStatus, parsedEvaluation);
    return { envio: serializeEnvio(updated), pontuacao: null };
  }

  const desafio = await getDesafioForEnvio(envio);
  const scoreRecipients = await getScoreRecipients(envio);
  const bonusApresentacaoAoVivo = getLivePresentationBonusPoints(desafio, parsedEvaluation.apresentacaoAoVivo);
  await assertNoDuplicateEvidenceScore(envio, desafio, scoreRecipients);
  await assertRecurringScoreLimit(envio, desafio, scoreRecipients, new Date(), {
    pontosSolicitados: getChallengeBasePoints(desafio) + bonusApresentacaoAoVivo,
  });
  applyEvaluation(envio, reviewer, parsedEvaluation);
  const updated = await envio.save();
  const pontuacao = await generatePontuacoesForApprovedEnvio(updated, desafio, scoreRecipients, {
    apresentacaoAoVivo: parsedEvaluation.apresentacaoAoVivo,
    skipRecurrenceCheck: true,
  });
  await logEvaluationEvent(updated, reviewer, currentStatus, parsedEvaluation);
  return {
    envio: serializeEnvio(updated),
    pontuacao,
  };
}

module.exports = {
  evaluateEnvio,
  listPending,
};
