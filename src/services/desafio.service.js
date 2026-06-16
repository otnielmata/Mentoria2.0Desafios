const Desafio = require("../models/desafio.model");
const Pilar = require("../models/pilar.model");
const User = require("../models/user.model");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  parseDifficulty,
  parseObjectId,
  parseOptionalObjectId,
  parseOptionalText,
  parsePagination,
  parseRequiredText,
  pointsForDifficulty,
  toIsoDate,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];
const ALLOWED_TYPES = ["individual", "grupo", "ambos"];
const GROUP_TYPES = ["grupo", "ambos"];
const ACTIVE_STATUS = "ativo";
const ALLOWED_STATUSES = ["ativo", "inativo", "apagado"];
const ALLOWED_RECURRENCE_PERIODS = ["diario", "semanal", "mensal"];
const ALLOWED_RECURRENCE_ACTIONS = ["bloquear"];

function serializePilar(pilar) {
  if (!pilar || typeof pilar !== "object") return pilar ? { id: getEntityId(pilar) } : null;
  return {
    id: getEntityId(pilar),
    name: pilar.name,
    description: pilar.description,
    status: pilar.status,
  };
}

function serializeDesafio(desafio) {
  return {
    id: getEntityId(desafio),
    pilar: serializePilar(desafio.pilar),
    pilarId: getEntityId(desafio.pilar),
    title: desafio.title,
    description: desafio.description,
    deliveryDate: toIsoDate(desafio.deliveryDate),
    dataEntrega: toIsoDate(desafio.deliveryDate),
    difficulty: desafio.difficulty,
    points: desafio.points,
    livePresentationPoints: Number(desafio.livePresentationPoints || 0),
    pontosApresentacaoAoVivo: Number(desafio.livePresentationPoints || 0),
    type: desafio.type,
    maxParticipantes: desafio.maxParticipantes,
    recorrencia: desafio.recorrencia,
    status: desafio.status,
  };
}

function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${fieldName} deve ser uma data válida.`, 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: fieldName, message: `${fieldName} deve ser uma data válida.` }],
    });
  }
  return date;
}

async function assertAdmin(authenticatedUserId, message) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError(message, 403);
  return user;
}

async function getAuthenticatedUser(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  return user;
}

function isAdminUser(user) {
  return ADMIN_ROLES.includes(normalizeText(user.role));
}

function parseType(value) {
  const type = normalizeText(value);
  if (!ALLOWED_TYPES.includes(type)) throw createHttpError("Tipo deve ser individual, grupo ou ambos.", 400);
  return type;
}

function parsePoints(payload, difficulty, { required = false } = {}) {
  const rawPoints = getFirstValue(payload, ["points", "pontos"]);
  if (rawPoints === undefined || rawPoints === null || rawPoints === "") {
    if (required) {
      throw createHttpError("pontos é obrigatório para cadastro de desafio.", 400, {
        code: "VALIDATION_ERROR",
        details: [{ field: "pontos", message: "Informe a pontuação fixa do desafio." }],
      });
    }

    return pointsForDifficulty(difficulty);
  }

  const points = Number(rawPoints);
  if (!Number.isFinite(points) || points <= 0) throw createHttpError("Pontuação deve ser maior que zero.", 400);
  return points;
}

function parseNonNegativePoints(payload, fields, fieldName) {
  const rawPoints = getFirstValue(payload, fields);
  if (rawPoints === undefined || rawPoints === null || rawPoints === "") return 0;
  const points = Number(rawPoints);
  if (!Number.isFinite(points) || points < 0) throw createHttpError(`${fieldName} deve ser maior ou igual a zero.`, 400);
  return points;
}

function parseStatus(value) {
  const status = normalizeText(value || ACTIVE_STATUS);

  if (!ALLOWED_STATUSES.includes(status)) {
    throw createHttpError("Status deve ser ativo, inativo ou apagado.", 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "status", message: "Status deve ser ativo, inativo ou apagado." }],
    });
  }

  return status;
}

function parseMaxParticipantes(payload, type) {
  const raw = getFirstValue(payload, ["maxParticipantes", "max_participantes", "maxParticipants"]);
  if (raw === undefined || raw === null || raw === "") return GROUP_TYPES.includes(type) ? 5 : 1;
  const maxParticipantes = Number(raw);
  if (!Number.isInteger(maxParticipantes) || maxParticipantes < 1 || maxParticipantes > 5) {
    throw createHttpError("max_participantes deve ser um número entre 1 e 5.", 400);
  }
  return maxParticipantes;
}

function parseBoolean(value, fieldName, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (["true", "1", "sim", "s"].includes(normalizeText(value))) return true;
  if (["false", "0", "nao", "não", "n"].includes(normalizeText(value))) return false;
  throw createHttpError(`${fieldName} deve ser verdadeiro ou falso.`, 400);
}

function hasRecorrenciaFields(payload = {}) {
  return [
    "recorrencia",
    "recurrence",
    "recorrente",
    "isRecurring",
    "periodoRecorrencia",
    "recurrencePeriod",
    "limitePontos",
    "limite_pontos",
    "limitePontosPeriodo",
    "limite_pontos_periodo",
    "limitePontuacaoPeriodo",
    "limite_pontuacao_periodo",
    "maxPointsPerPeriod",
  ].some((field) => Object.prototype.hasOwnProperty.call(payload, field));
}

function getRecorrenciaValue(payload, fields) {
  return getFirstValue(payload, fields);
}

function parseRecorrencia(payload = {}) {
  if (!hasRecorrenciaFields(payload)) {
    return undefined;
  }

  const raw = getFirstValue(payload, ["recorrencia", "recurrence"]);
  if (raw !== undefined && (raw === null || typeof raw !== "object" || Array.isArray(raw))) {
    throw createHttpError("recorrencia deve ser um objeto válido.", 400);
  }

  const source = raw || {};
  const enabled = parseBoolean(
    getRecorrenciaValue(source, ["enabled", "ativo", "recorrente"]) ?? getRecorrenciaValue(payload, ["recorrente", "isRecurring"]),
    "recorrencia.enabled",
    false
  );
  const periodo = normalizeText(
    getRecorrenciaValue(source, ["periodo", "period", "periodoRecorrencia", "recurrencePeriod"]) ||
      getRecorrenciaValue(payload, ["periodoRecorrencia", "recurrencePeriod"]) ||
      "mensal"
  );
  if (!ALLOWED_RECURRENCE_PERIODS.includes(periodo)) {
    throw createHttpError("Período de recorrência deve ser diario, semanal ou mensal.", 400);
  }

  const rawLimitePontos =
    getRecorrenciaValue(source, [
      "limitePontos",
      "limite_pontos",
      "limitePontosPeriodo",
      "limite_pontos_periodo",
      "limitePontuacaoPeriodo",
      "limite_pontuacao_periodo",
      "maxPointsPerPeriod",
    ]) ??
    getRecorrenciaValue(payload, [
      "limitePontos",
      "limite_pontos",
      "limitePontosPeriodo",
      "limite_pontos_periodo",
      "limitePontuacaoPeriodo",
      "limite_pontuacao_periodo",
      "maxPointsPerPeriod",
    ]);
  const limitePontos = rawLimitePontos === undefined || rawLimitePontos === null || rawLimitePontos === "" ? null : Number(rawLimitePontos);

  if (enabled && (!Number.isFinite(limitePontos) || limitePontos <= 0)) {
    throw createHttpError("limitePontos deve ser maior que zero para desafio recorrente.", 400);
  }

  if (limitePontos !== null && (!Number.isFinite(limitePontos) || limitePontos <= 0)) {
    throw createHttpError("limitePontos deve ser maior que zero.", 400);
  }

  const acaoAoExceder = normalizeText(getRecorrenciaValue(source, ["acaoAoExceder", "acao_ao_exceder", "action"]) || "bloquear");
  if (!ALLOWED_RECURRENCE_ACTIONS.includes(acaoAoExceder)) {
    throw createHttpError("Ação de recorrência deve ser bloquear.", 400);
  }

  return {
    enabled,
    periodo,
    limitePontos,
    acaoAoExceder,
  };
}

async function assertActivePilar(pilarId) {
  const pilar = await Pilar.findById(pilarId);
  if (!pilar) throw createHttpError("Pilar não encontrado.", 404);
  if (normalizeText(pilar.status) !== ACTIVE_STATUS) throw createHttpError("Pilar deve estar ativo para cadastrar desafio.", 400);
  return pilar;
}

async function createDesafio(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode cadastrar desafios.");
  const pilarId = parseObjectId(getFirstValue(payload, ["pilarId", "pilar_id", "pilar"]), "Pilar deve ser um identificador válido.");
  await assertActivePilar(pilarId);
  const difficulty = parseDifficulty(getFirstValue(payload, ["difficulty", "dificuldade"]), "facil");
  const type = parseType(getFirstValue(payload, ["type", "tipo"]));

  const desafio = await Desafio.create({
    pilar: pilarId,
    title: parseRequiredText(payload.title || payload.titulo, "Título"),
    description: parseRequiredText(payload.description || payload.descricao, "Descrição"),
    deliveryDate: parseOptionalDate(payload.deliveryDate || payload.dataEntrega || payload.data_entrega, "dataEntrega"),
    difficulty,
    points: parsePoints(payload, difficulty, { required: true }),
    livePresentationPoints: parseNonNegativePoints(
      payload,
      ["livePresentationPoints", "pontosApresentacaoAoVivo", "pontos_apresentacao_ao_vivo", "presentationPoints"],
      "pontosApresentacaoAoVivo"
    ),
    type,
    maxParticipantes: parseMaxParticipantes(payload, type),
    recorrencia: parseRecorrencia(payload),
    status: parseStatus(payload.status || payload.situacao),
  });

  return serializeDesafio(desafio);
}

async function listDesafios(authenticatedUserId, query = {}) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  const isAdmin = isAdminUser(user);
  const filters = {};
  const pilarId = parseOptionalObjectId(query.pilarId || query.pilar_id || query.pilar, "Pilar deve ser um identificador válido.");
  if (pilarId) filters.pilar = pilarId;

  if (query.type || query.tipo) filters.type = parseType(query.type || query.tipo);
  if (isAdmin && query.status) {
    filters.status = String(query.status).trim();
  } else if (!isAdmin) {
    filters.status = ACTIVE_STATUS;
  }

  const { page, limit, skip } = parsePagination(query);
  const [total, desafios] = await Promise.all([
    Desafio.countDocuments(filters),
    Desafio.find(filters).populate("pilar").sort({ title: 1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    pagination: buildPagination(total, page, limit),
    desafios: desafios.map(serializeDesafio),
  };
}

async function getDesafio(authenticatedUserId, desafioId) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const filters = { _id: id };
  if (!isAdminUser(user)) filters.status = ACTIVE_STATUS;
  const desafio = await Desafio.findOne(filters).populate("pilar").lean();
  if (!desafio) throw createHttpError("Desafio não encontrado.", 404);
  return serializeDesafio(desafio);
}

async function updateDesafio(authenticatedUserId, desafioId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode editar desafios.");
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const updates = {};

  if (payload.pilarId || payload.pilar_id || payload.pilar) {
    updates.pilar = parseObjectId(payload.pilarId || payload.pilar_id || payload.pilar, "Pilar deve ser um identificador válido.");
    await assertActivePilar(updates.pilar);
  }
  if (payload.title || payload.titulo) updates.title = parseRequiredText(payload.title || payload.titulo, "Título");
  if (payload.description || payload.descricao) updates.description = parseRequiredText(payload.description || payload.descricao, "Descrição");
  if (
    payload.deliveryDate !== undefined ||
    payload.dataEntrega !== undefined ||
    payload.data_entrega !== undefined
  ) {
    updates.deliveryDate = parseOptionalDate(payload.deliveryDate || payload.dataEntrega || payload.data_entrega, "dataEntrega");
  }
  if (payload.type || payload.tipo) updates.type = parseType(payload.type || payload.tipo);
  if (payload.difficulty || payload.dificuldade) updates.difficulty = parseDifficulty(payload.difficulty || payload.dificuldade);

  const difficulty = updates.difficulty || "facil";
  if (payload.points !== undefined || payload.pontos !== undefined || updates.difficulty) updates.points = parsePoints(payload, difficulty);
  if (
    payload.livePresentationPoints !== undefined ||
    payload.pontosApresentacaoAoVivo !== undefined ||
    payload.pontos_apresentacao_ao_vivo !== undefined ||
    payload.presentationPoints !== undefined
  ) {
    updates.livePresentationPoints = parseNonNegativePoints(
      payload,
      ["livePresentationPoints", "pontosApresentacaoAoVivo", "pontos_apresentacao_ao_vivo", "presentationPoints"],
      "pontosApresentacaoAoVivo"
    );
  }
  if (payload.maxParticipantes !== undefined || payload.max_participantes !== undefined || payload.maxParticipants !== undefined) {
    updates.maxParticipantes = parseMaxParticipantes(payload, updates.type || "grupo");
  }
  if (hasRecorrenciaFields(payload)) updates.recorrencia = parseRecorrencia(payload);
  if (payload.status || payload.situacao) updates.status = parseStatus(payload.status || payload.situacao);

  const desafio = await Desafio.findByIdAndUpdate(id, updates, { new: true }).populate("pilar").lean();
  if (!desafio) throw createHttpError("Desafio não encontrado.", 404);
  return serializeDesafio(desafio);
}

async function disableDesafio(authenticatedUserId, desafioId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode apagar desafios.");
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const desafio = await Desafio.findByIdAndUpdate(id, { status: "apagado" }, { new: true }).populate("pilar").lean();
  if (!desafio) throw createHttpError("Desafio não encontrado.", 404);
  return serializeDesafio(desafio);
}

module.exports = {
  createDesafio,
  disableDesafio,
  getDesafio,
  listDesafios,
  updateDesafio,
};
