const AuditEvent = require("../models/audit-event.model");
const User = require("../models/user.model");
const { sanitizeMetadata } = require("./audit.service");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  omitUndefined,
  parseOptionalObjectId,
  parsePagination,
  parsePeriod,
  toIsoDate,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];

async function assertCanViewAudit(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError("Apenas professor ou admin pode consultar auditoria.", 403);
}

function parseFilters(query = {}) {
  const period = parsePeriod(query);

  return {
    eventType: normalizeText(getFirstValue(query, ["eventType", "evento", "tipo"])),
    aluno: parseOptionalObjectId(getFirstValue(query, ["alunoId", "aluno_id", "aluno"]), "Aluno deve ser um identificador válido."),
    actor: parseOptionalObjectId(getFirstValue(query, ["actorId", "atorId", "ator"]), "Ator deve ser um identificador válido."),
    desafio: parseOptionalObjectId(getFirstValue(query, ["desafioId", "desafio_id", "desafio"]), "Desafio deve ser um identificador válido."),
    envio: parseOptionalObjectId(getFirstValue(query, ["envioId", "envio_id", "envio"]), "Envio deve ser um identificador válido."),
    turma: parseOptionalObjectId(getFirstValue(query, ["turmaId", "turma_id", "turma"]), "Turma deve ser um identificador válido."),
    occurredAt: period.createdAt,
    startDate: period.startDate,
    endDate: period.endDate,
  };
}

function buildAuditFilters(filters) {
  return omitUndefined({
    eventType: filters.eventType || undefined,
    actor: filters.actor,
    aluno: filters.aluno,
    desafio: filters.desafio,
    envio: filters.envio,
    turma: filters.turma,
    occurredAt: filters.occurredAt,
  });
}

function serializeUser(user) {
  if (!user) return null;
  if (typeof user !== "object") return { id: getEntityId(user) };

  return omitUndefined({
    id: getEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  });
}

function serializeReference(entity, fields = []) {
  if (!entity) return null;
  if (typeof entity !== "object") return { id: getEntityId(entity) };

  return omitUndefined(
    fields.reduce(
      (serialized, field) => ({
        ...serialized,
        [field]: entity[field],
      }),
      { id: getEntityId(entity) }
    )
  );
}

function serializeAuditEvent(event) {
  return {
    id: getEntityId(event),
    eventType: event.eventType,
    actor: serializeUser(event.actor),
    aluno: serializeUser(event.aluno),
    desafio: serializeReference(event.desafio, ["title", "description", "points", "status"]),
    envio: serializeReference(event.envio, ["status", "type"]),
    turma: serializeReference(event.turma, ["name", "code", "status"]),
    pontuacao: serializeReference(event.pontuacao, ["pontos", "motivo", "source"]),
    statusAnterior: event.statusAnterior,
    statusNovo: event.statusNovo,
    feedback: event.feedback,
    metadata: sanitizeMetadata(event.metadata || {}),
    occurredAt: toIsoDate(event.occurredAt),
    createdAt: toIsoDate(event.createdAt),
  };
}

function serializeFilters(filters) {
  return omitUndefined({
    eventType: filters.eventType || undefined,
    alunoId: filters.aluno,
    actorId: filters.actor,
    desafioId: filters.desafio,
    envioId: filters.envio,
    turmaId: filters.turma,
    startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
    endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
  });
}

async function listAuditEvents(authenticatedUserId, query = {}) {
  await assertCanViewAudit(authenticatedUserId);

  const filters = parseFilters(query);
  const { page, limit, skip } = parsePagination(query);
  const mongoFilters = buildAuditFilters(filters);
  const [total, events] = await Promise.all([
    AuditEvent.countDocuments(mongoFilters),
    AuditEvent.find(mongoFilters)
      .populate("actor", "name email role status")
      .populate("aluno", "name email role status")
      .populate("desafio", "title description points status")
      .populate("envio", "status type")
      .populate("turma", "name code status")
      .populate("pontuacao", "pontos motivo source")
      .sort({ occurredAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    total,
    pagination: buildPagination(total, page, limit),
    filtros: serializeFilters(filters),
    eventos: (events || []).map(serializeAuditEvent),
  };
}

module.exports = {
  listAuditEvents,
};
