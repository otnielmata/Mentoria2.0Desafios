const Desafio = require("../models/desafio.model");
const Pilar = require("../models/pilar.model");
const User = require("../models/user.model");
const {
  createHttpError,
  getEntityId,
  getFirstValue,
  normalizeText,
  parseDifficulty,
  parseObjectId,
  parseOptionalObjectId,
  parseOptionalText,
  parseRequiredText,
  pointsForDifficulty,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];
const ALLOWED_TYPES = ["individual", "grupo", "ambos"];
const GROUP_TYPES = ["grupo", "ambos"];
const ACTIVE_STATUS = "ativo";

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
    difficulty: desafio.difficulty,
    points: desafio.points,
    type: desafio.type,
    maxParticipantes: desafio.maxParticipantes,
    status: desafio.status,
  };
}

async function assertAdmin(authenticatedUserId, message) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError(message, 403);
}

function parseType(value) {
  const type = normalizeText(value);
  if (!ALLOWED_TYPES.includes(type)) throw createHttpError("Tipo deve ser individual, grupo ou ambos.", 400);
  return type;
}

function parsePoints(payload, difficulty) {
  const rawPoints = getFirstValue(payload, ["points", "pontos"]);
  if (rawPoints === undefined || rawPoints === null || rawPoints === "") return pointsForDifficulty(difficulty);

  const points = Number(rawPoints);
  if (!Number.isFinite(points) || points <= 0) throw createHttpError("Pontuação deve ser maior que zero.", 400);
  return points;
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
    difficulty,
    points: parsePoints(payload, difficulty),
    type,
    maxParticipantes: parseMaxParticipantes(payload, type),
    status: ACTIVE_STATUS,
  });

  return serializeDesafio(desafio);
}

async function listDesafios(authenticatedUserId, query = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode listar desafios.");
  const filters = {};
  const pilarId = parseOptionalObjectId(query.pilarId || query.pilar_id || query.pilar, "Pilar deve ser um identificador válido.");
  if (pilarId) filters.pilar = pilarId;
  if (query.status) filters.status = String(query.status).trim();
  const desafios = await Desafio.find(filters).populate("pilar").sort({ title: 1 }).lean();
  return { total: desafios.length, desafios: desafios.map(serializeDesafio) };
}

async function getDesafio(authenticatedUserId, desafioId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode visualizar desafios.");
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const desafio = await Desafio.findById(id).populate("pilar").lean();
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
  if (payload.type || payload.tipo) updates.type = parseType(payload.type || payload.tipo);
  if (payload.difficulty || payload.dificuldade) updates.difficulty = parseDifficulty(payload.difficulty || payload.dificuldade);

  const difficulty = updates.difficulty || "facil";
  if (payload.points !== undefined || payload.pontos !== undefined || updates.difficulty) updates.points = parsePoints(payload, difficulty);
  if (payload.maxParticipantes !== undefined || payload.max_participantes !== undefined || payload.maxParticipants !== undefined) {
    updates.maxParticipantes = parseMaxParticipantes(payload, updates.type || "grupo");
  }
  if (payload.status) updates.status = parseRequiredText(payload.status, "Status");

  const desafio = await Desafio.findByIdAndUpdate(id, updates, { new: true }).populate("pilar").lean();
  if (!desafio) throw createHttpError("Desafio não encontrado.", 404);
  return serializeDesafio(desafio);
}

async function disableDesafio(authenticatedUserId, desafioId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode desativar desafios.");
  const id = parseObjectId(desafioId, "Desafio deve ser um identificador válido.");
  const desafio = await Desafio.findByIdAndUpdate(id, { status: "inativo" }, { new: true }).populate("pilar").lean();
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
