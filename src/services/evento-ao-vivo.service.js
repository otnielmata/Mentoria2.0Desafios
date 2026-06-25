const EventoAoVivo = require("../models/evento-ao-vivo.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  omitUndefined,
  parseObjectId,
  parseOptionalObjectId,
  parseOptionalText,
  parsePagination,
  parsePeriod,
  parseRequiredText,
  toIsoDate,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const VALID_EVENT_TYPES = Object.values(EventoAoVivo.eventTypes);

function serializeTurmaRef(turma) {
  if (!turma) return null;
  if (typeof turma === "string") return { id: turma };
  return {
    id: getEntityId(turma),
    name: turma.name,
    nome: turma.name,
    code: turma.code,
  };
}

function serializeEvento(evento) {
  return {
    id: getEntityId(evento),
    title: evento.title,
    titulo: evento.title,
    description: evento.description,
    descricao: evento.description,
    startAt: toIsoDate(evento.startAt),
    dataInicio: toIsoDate(evento.startAt),
    endAt: toIsoDate(evento.endAt),
    dataFim: toIsoDate(evento.endAt),
    type: evento.type,
    tipo: evento.type,
    turma: serializeTurmaRef(evento.turma),
    turmaId: getEntityId(evento.turma),
    guestName: evento.guestName,
    convidado: evento.guestName,
    weekNumber: evento.weekNumber,
    semana: evento.weekNumber,
    link: evento.link,
    status: evento.status,
    source: "mentoria",
    editable: false,
    readOnly: true,
  };
}

async function getAuthenticatedUser(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId).lean();
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  return user;
}

async function assertAdmin(authenticatedUserId, message) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError(message, 403);
  return user;
}

async function assertStudent(authenticatedUserId, message) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  if (normalizeText(user.role) !== STUDENT_ROLE) throw createHttpError(message, 403);
  return user;
}

function parseDateField(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw createHttpError(`${fieldName} deve ser uma data válida.`, 400);
  return date;
}

function parseEventType(value, fallback = EventoAoVivo.eventTypes.live) {
  const type = normalizeText(value || fallback);
  if (!VALID_EVENT_TYPES.includes(type)) {
    throw createHttpError("tipo deve ser ao_vivo, modulo_gravado ou conteudo_especial.", 400);
  }
  return type;
}

function parseWeekNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createHttpError("semana deve ser um número inteiro maior que zero.", 400);
  }
  return parsed;
}

function assertValidPeriod(startAt, endAt) {
  if (startAt && endAt && startAt > endAt) {
    throw createHttpError("dataInicio não pode ser posterior à dataFim.", 400);
  }
}

async function assertTurmaExists(turmaId) {
  const id = parseObjectId(turmaId, "Turma deve ser um identificador válido.");
  const turma = await Turma.findById(id).lean();
  if (!turma) throw createHttpError("Turma não encontrada.", 404);
  return turma;
}

async function findStudentTurmaIds(authenticatedUserId) {
  const turmas = await Turma.find({ alunos: authenticatedUserId }).select("_id").lean();
  return (turmas || []).map(getEntityId).filter(Boolean);
}

function buildDateRangeFilter(query = {}) {
  const period = parsePeriod(query);
  if (period.startDate || period.endDate) {
    const startAt = {};
    if (period.startDate) startAt.$gte = period.startDate;
    if (period.endDate) startAt.$lte = period.endDate;
    return { startAt };
  }

  const month = getFirstValue(query, ["month", "mes"]);
  const year = getFirstValue(query, ["year", "ano"]);
  if (month && year) {
    const parsedMonth = Number(month);
    const parsedYear = Number(year);
    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      throw createHttpError("mes deve estar entre 1 e 12.", 400);
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 2000) {
      throw createHttpError("ano deve ser um ano válido.", 400);
    }
    const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999));
    return { startAt: { $gte: startDate, $lte: endDate } };
  }

  return {};
}

async function createEvento(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode cadastrar eventos ao vivo.");
  const turmaId = parseObjectId(payload.turmaId || payload.turma, "Turma é obrigatória.");
  await assertTurmaExists(turmaId);

  const startAt = parseDateField(payload.startAt || payload.dataInicio || payload.startDate, "dataInicio");
  if (!startAt) throw createHttpError("dataInicio é obrigatória.", 400);
  const endAt = parseDateField(payload.endAt || payload.dataFim || payload.endDate, "dataFim");
  assertValidPeriod(startAt, endAt);

  const evento = await EventoAoVivo.create({
    title: parseRequiredText(payload.title || payload.titulo, "Título"),
    description: parseOptionalText(payload.description || payload.descricao, "Descrição") || null,
    startAt,
    endAt,
    type: parseEventType(payload.type || payload.tipo),
    turma: turmaId,
    guestName: parseOptionalText(payload.guestName || payload.convidado, "Convidado") || null,
    weekNumber: parseWeekNumber(payload.weekNumber ?? payload.semana),
    link: parseOptionalText(payload.link, "Link") || null,
    status: payload.status || ACTIVE_STATUS,
  });

  const populated = await EventoAoVivo.findById(evento._id).populate("turma").lean();
  return serializeEvento(populated);
}

async function listEventos(authenticatedUserId, query = {}) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  const isAdmin = ADMIN_ROLES.includes(normalizeText(user.role));
  const isStudent = normalizeText(user.role) === STUDENT_ROLE;

  if (!isAdmin && !isStudent) {
    throw createHttpError("Apenas aluno, professor ou admin pode consultar eventos ao vivo.", 403);
  }

  const filters = { deletedAt: null };
  if (query.status) {
    filters.status = String(query.status).trim();
  } else if (isStudent) {
    filters.status = ACTIVE_STATUS;
  }

  const turmaId = parseOptionalObjectId(query.turmaId || query.turma, "Turma deve ser um identificador válido.");
  if (turmaId) {
    filters.turma = turmaId;
  } else if (isStudent) {
    const turmaIds = await findStudentTurmaIds(authenticatedUserId);
    if (turmaIds.length === 0) {
      const { page, limit } = parsePagination(query);
      return { total: 0, pagination: buildPagination(0, page, limit), eventos: [] };
    }
    filters.turma = { $in: turmaIds };
  }

  const type = parseOptionalText(query.type || query.tipo, "Tipo");
  if (type) filters.type = parseEventType(type);

  Object.assign(filters, buildDateRangeFilter(query));

  const { page, limit, skip } = parsePagination(query);
  const [total, eventos] = await Promise.all([
    EventoAoVivo.countDocuments(filters),
    EventoAoVivo.find(filters).populate("turma").sort({ startAt: 1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    pagination: buildPagination(total, page, limit),
    eventos: eventos.map(serializeEvento),
  };
}

async function getEvento(authenticatedUserId, eventoId) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  const isAdmin = ADMIN_ROLES.includes(normalizeText(user.role));
  const isStudent = normalizeText(user.role) === STUDENT_ROLE;
  if (!isAdmin && !isStudent) {
    throw createHttpError("Apenas aluno, professor ou admin pode visualizar eventos ao vivo.", 403);
  }

  const id = parseObjectId(eventoId, "Evento deve ser um identificador válido.");
  const evento = await EventoAoVivo.findOne({ _id: id, deletedAt: null }).populate("turma").lean();
  if (!evento) throw createHttpError("Evento ao vivo não encontrado.", 404);

  if (isStudent) {
    if (evento.status !== ACTIVE_STATUS) throw createHttpError("Evento ao vivo não encontrado.", 404);
    const turmaIds = await findStudentTurmaIds(authenticatedUserId);
    if (!turmaIds.includes(getEntityId(evento.turma))) {
      throw createHttpError("Evento ao vivo não encontrado.", 404);
    }
  }

  return serializeEvento(evento);
}

async function updateEvento(authenticatedUserId, eventoId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode editar eventos ao vivo.");
  const id = parseObjectId(eventoId, "Evento deve ser um identificador válido.");
  const evento = await EventoAoVivo.findOne({ _id: id, deletedAt: null });
  if (!evento) throw createHttpError("Evento ao vivo não encontrado.", 404);

  const update = {};
  if (hasPayloadField(payload, ["title", "titulo"])) {
    update.title = parseRequiredText(payload.title || payload.titulo, "Título");
  }
  if (hasPayloadField(payload, ["description", "descricao"])) {
    update.description = parseOptionalText(payload.description || payload.descricao, "Descrição") || null;
  }
  if (hasPayloadField(payload, ["startAt", "dataInicio", "startDate"])) {
    update.startAt = parseDateField(payload.startAt || payload.dataInicio || payload.startDate, "dataInicio");
  }
  if (hasPayloadField(payload, ["endAt", "dataFim", "endDate"])) {
    update.endAt = parseDateField(payload.endAt || payload.dataFim || payload.endDate, "dataFim");
  }
  if (hasPayloadField(payload, ["type", "tipo"])) {
    update.type = parseEventType(payload.type || payload.tipo);
  }
  if (hasPayloadField(payload, ["turmaId", "turma"])) {
    const turmaId = parseObjectId(payload.turmaId || payload.turma, "Turma deve ser um identificador válido.");
    await assertTurmaExists(turmaId);
    update.turma = turmaId;
  }
  if (hasPayloadField(payload, ["guestName", "convidado"])) {
    update.guestName = parseOptionalText(payload.guestName || payload.convidado, "Convidado") || null;
  }
  if (hasPayloadField(payload, ["weekNumber", "semana"])) {
    update.weekNumber = parseWeekNumber(payload.weekNumber ?? payload.semana);
  }
  if (hasPayloadField(payload, ["link"])) {
    update.link = parseOptionalText(payload.link, "Link") || null;
  }
  if (hasPayloadField(payload, ["status"])) {
    update.status = parseRequiredText(payload.status, "Status");
  }

  assertValidPeriod(update.startAt || evento.startAt, update.endAt !== undefined ? update.endAt : evento.endAt);

  await EventoAoVivo.updateOne({ _id: id }, omitUndefined(update));
  const updated = await EventoAoVivo.findById(id).populate("turma").lean();
  return serializeEvento(updated);
}

async function disableEvento(authenticatedUserId, eventoId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode excluir eventos ao vivo.");
  const id = parseObjectId(eventoId, "Evento deve ser um identificador válido.");
  const evento = await EventoAoVivo.findOne({ _id: id, deletedAt: null });
  if (!evento) throw createHttpError("Evento ao vivo não encontrado.", 404);

  await EventoAoVivo.updateOne({ _id: id }, { status: INACTIVE_STATUS, deletedAt: new Date() });
  const updated = await EventoAoVivo.findById(id).populate("turma").lean();
  return serializeEvento(updated);
}

function hasPayloadField(payload, fields) {
  return fields.some((field) => Object.prototype.hasOwnProperty.call(payload || {}, field));
}

async function listEventosForAgenda(authenticatedUserId, query = {}) {
  const result = await listEventos(authenticatedUserId, { ...query, limit: query.limit || 500, page: 1 });
  return result.eventos;
}

module.exports = {
  createEvento,
  disableEvento,
  getEvento,
  listEventos,
  listEventosForAgenda,
  serializeEvento,
  updateEvento,
};
