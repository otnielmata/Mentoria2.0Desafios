const Desafio = require("../models/desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const ParticipanteEnvio = require("../models/participante-envio.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  parseObjectId,
  parseOptionalObjectId,
  parsePagination,
  parsePeriod,
  toIsoDate,
} = require("./domain-utils");

const REVIEWER_ROLES = ["professor", "admin"];
const ALLOWED_DECISIONS = ["aprovado", "reprovado", "ajuste"];
const FEEDBACK_REQUIRED_DECISIONS = ["reprovado", "ajuste"];
const APPROVED_STATUS = "aprovado";
const PENDING_STATUS = "pendente";
const CANCELED_STATUS = "cancelado";
const GROUP_TYPE = "grupo";

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
  if (FEEDBACK_REQUIRED_DECISIONS.includes(decision) && (!feedback || typeof feedback !== "string" || feedback.trim().length === 0)) {
    throw createHttpError("Feedback é obrigatório para reprovar ou solicitar ajuste.", 400);
  }

  return {
    decision,
    feedback: typeof feedback === "string" ? feedback.trim() : null,
    avaliacao: {
      decision,
      feedback: typeof feedback === "string" ? feedback.trim() : null,
    },
  };
}

function serializeEnvio(envio) {
  return {
    id: getEntityId(envio),
    desafioId: getEntityId(envio.desafio),
    turmaId: getEntityId(envio.turma),
    alunoId: getEntityId(envio.aluno),
    description: envio.description,
    type: envio.type,
    evidencias: envio.evidencias,
    participantes: (envio.participantes || []).map(getEntityId),
    status: envio.status,
    feedback: envio.feedback,
    evaluatedBy: envio.evaluatedBy ? getEntityId(envio.evaluatedBy) : null,
    evaluatedAt: toIsoDate(envio.evaluatedAt),
    approvedBy: envio.approvedBy ? getEntityId(envio.approvedBy) : null,
    approvedAt: toIsoDate(envio.approvedAt),
  };
}

async function listPending(authenticatedUserId, query = {}) {
  await getReviewer(authenticatedUserId);
  const period = parsePeriod(query);
  const filters = { status: PENDING_STATUS };
  if (period.createdAt) filters.createdAt = period.createdAt;
  const turmaId = parseOptionalObjectId(query.turmaId || query.turma_id || query.turma, "Turma deve ser um identificador válido.");
  if (turmaId) filters.turma = turmaId;

  const desafioId = parseOptionalObjectId(query.desafioId || query.desafio_id || query.desafio, "Desafio deve ser um identificador válido.");
  const pilarId = parseOptionalObjectId(query.pilarId || query.pilar_id || query.pilar, "Pilar deve ser um identificador válido.");
  if (pilarId) {
    const desafios = await Desafio.find({ pilar: pilarId }).select("_id").lean();
    const desafioIds = (desafios || []).map(getEntityId);
    filters.desafio = desafioId ? (desafioIds.includes(desafioId) ? desafioId : { $in: [] }) : { $in: desafioIds };
  } else if (desafioId) {
    filters.desafio = desafioId;
  }

  const alunoId = parseOptionalObjectId(query.alunoId || query.aluno_id || query.aluno, "Aluno deve ser um identificador válido.");
  if (alunoId) filters.$or = [{ aluno: alunoId }, { participantes: alunoId }];

  const { page, limit, skip } = parsePagination(query);
  const sortDirection = ["desc", "recentes", "-createdAt"].includes(String(query.sort || query.ordenacao || "").trim()) ? -1 : 1;
  const [total, envios] = await Promise.all([
    EnvioDesafio.countDocuments(filters),
    EnvioDesafio.find(filters)
      .populate("aluno", "name email role status")
      .populate("turma", "name code status")
      .populate({
        path: "desafio",
        select: "title points difficulty type pilar",
        populate: { path: "pilar", select: "name description status" },
      })
      .sort({ createdAt: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);
  return {
    total,
    pagination: buildPagination(total, page, limit),
    envios: envios.map(serializeEnvio),
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

async function getScoreRecipients(envio) {
  const recipients = [getEntityId(envio.aluno)];
  if (normalizeText(envio.type) === GROUP_TYPE) {
    const links = await ParticipanteEnvio.find({ envio: getEntityId(envio), status: "ativo" }).lean();
    (links || []).forEach((link) => recipients.push(getEntityId(link.aluno)));
    (envio.participantes || []).forEach((participante) => recipients.push(getEntityId(participante)));
  }
  return [...new Set(recipients.filter(Boolean))];
}

async function generatePontuacoesForApprovedEnvio(envio, desafio) {
  const envioId = getEntityId(envio);
  const desafioId = getEntityId(desafio);
  const pontos = Number(desafio.points);
  if (!Number.isFinite(pontos) || pontos <= 0) throw createHttpError("Desafio não possui pontuação válida.", 400);

  const alunos = await getScoreRecipients(envio);
  const existing = await Pontuacao.find({ envio: envioId, aluno: { $in: alunos } }).lean();
  const existingAlunoIds = new Set((existing || []).map((pontuacao) => getEntityId(pontuacao.aluno)));
  const pontuacoesToCreate = alunos
    .filter((alunoId) => !existingAlunoIds.has(alunoId))
    .map((alunoId) => ({
      envio: envioId,
      desafio: desafioId,
      aluno: alunoId,
      pontos,
      motivo: `desafio_${desafio.difficulty || "pontuacao_fixa"}`,
      source: "envio_desafio",
    }));

  if (pontuacoesToCreate.length > 0) await Pontuacao.create(pontuacoesToCreate);
  return { pontos, geradas: pontuacoesToCreate.length, ignoradas: alunos.length - pontuacoesToCreate.length, alunos };
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
    return { envio: serializeEnvio(updated), pontuacao: null };
  }

  const desafio = await getDesafioForEnvio(envio);
  applyEvaluation(envio, reviewer, parsedEvaluation);
  const updated = await envio.save();
  return {
    envio: serializeEnvio(updated),
    pontuacao: await generatePontuacoesForApprovedEnvio(updated, desafio),
  };
}

module.exports = {
  evaluateEnvio,
  listPending,
};
