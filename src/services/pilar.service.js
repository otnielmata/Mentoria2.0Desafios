const Desafio = require("../models/desafio.model");
const Pilar = require("../models/pilar.model");
const User = require("../models/user.model");
const {
  createHttpError,
  getEntityId,
  normalizeName,
  normalizeText,
  parseObjectId,
  parseOptionalText,
  parseRequiredText,
} = require("./domain-utils");

const ADMIN_ROLES = ["professor", "admin"];
const ACTIVE_STATUS = "ativo";

function serializePilar(pilar) {
  return {
    id: getEntityId(pilar),
    name: pilar.name,
    normalizedName: pilar.normalizedName,
    description: pilar.description,
    status: pilar.status,
    isDefault: Boolean(pilar.isDefault),
  };
}

function serializeDesafioResumo(desafio) {
  return {
    id: getEntityId(desafio),
    title: desafio.title,
    description: desafio.description,
    points: desafio.points,
    difficulty: desafio.difficulty,
    type: desafio.type,
    maxParticipantes: desafio.maxParticipantes,
    status: desafio.status,
  };
}

async function getAuthenticatedUser(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  return user;
}

async function assertAdmin(authenticatedUserId, message) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) throw createHttpError(message, 403);
}

async function createPilar(authenticatedUserId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode cadastrar pilares.");
  const name = parseRequiredText(payload.name || payload.nome, "Nome");
  const normalizedName = normalizeName(name);
  const existing = await Pilar.findOne({ normalizedName, status: ACTIVE_STATUS });
  if (existing) throw createHttpError("Pilar já cadastrado.", 409);

  const pilar = await Pilar.create({
    name,
    normalizedName,
    description: parseOptionalText(payload.description || payload.descricao, "Descrição") || null,
    status: ACTIVE_STATUS,
  });

  return serializePilar(pilar);
}

async function listPilares(authenticatedUserId, query = {}) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  const filters = {};
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) {
    filters.status = ACTIVE_STATUS;
  } else if (query.status) {
    filters.status = String(query.status).trim();
  } else {
    filters.status = ACTIVE_STATUS;
  }

  const pilares = await Pilar.find(filters).sort({ name: 1 }).lean();
  return { total: pilares.length, pilares: pilares.map(serializePilar) };
}

async function getPilar(authenticatedUserId, pilarId) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  const id = parseObjectId(pilarId, "Pilar deve ser um identificador válido.");
  const filters = { _id: id };
  const isAdmin = ADMIN_ROLES.includes(normalizeText(user.role));
  if (!isAdmin) filters.status = ACTIVE_STATUS;
  const pilar = await Pilar.findOne(filters).lean();
  if (!pilar) throw createHttpError("Pilar não encontrado.", 404);
  const desafioFilters = { pilar: id };
  if (!isAdmin) desafioFilters.status = ACTIVE_STATUS;
  const desafios = await Desafio.find(desafioFilters).sort({ title: 1 }).lean();
  return {
    ...serializePilar(pilar),
    desafios: desafios.map(serializeDesafioResumo),
  };
}

async function updatePilar(authenticatedUserId, pilarId, payload = {}) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode editar pilares.");
  const id = parseObjectId(pilarId, "Pilar deve ser um identificador válido.");
  const current = await Pilar.findById(id).lean();
  if (!current) throw createHttpError("Pilar não encontrado.", 404);
  const updates = {};

  if (payload.name || payload.nome) {
    const name = parseRequiredText(payload.name || payload.nome, "Nome");
    updates.name = name;
    updates.normalizedName = normalizeName(name);
  }

  if (payload.description !== undefined || payload.descricao !== undefined) {
    updates.description = parseOptionalText(payload.description || payload.descricao, "Descrição") || null;
  }

  if (payload.status) updates.status = parseRequiredText(payload.status, "Status");
  const targetStatus = updates.status || current.status;
  const targetNormalizedName = updates.normalizedName || current.normalizedName;
  if (normalizeText(targetStatus) === ACTIVE_STATUS) {
    const duplicate = await Pilar.findOne({
      _id: { $ne: id },
      normalizedName: targetNormalizedName,
      status: ACTIVE_STATUS,
    }).lean();
    if (duplicate) throw createHttpError("Pilar já cadastrado.", 409);
  }

  const pilar = await Pilar.findByIdAndUpdate(id, updates, { new: true }).lean();
  return serializePilar(pilar);
}

async function disablePilar(authenticatedUserId, pilarId) {
  await assertAdmin(authenticatedUserId, "Apenas professor ou admin pode desativar pilares.");
  const id = parseObjectId(pilarId, "Pilar deve ser um identificador válido.");
  const pilar = await Pilar.findByIdAndUpdate(id, { status: "inativo" }, { new: true }).lean();
  if (!pilar) throw createHttpError("Pilar não encontrado.", 404);
  return serializePilar(pilar);
}

module.exports = {
  createPilar,
  disablePilar,
  getPilar,
  listPilares,
  updatePilar,
};
