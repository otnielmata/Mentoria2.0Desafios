const Desafio = require("../models/desafio.model");
const Pilar = require("../models/pilar.model");
const User = require("../models/user.model");
const { seedDefaultPilares } = require("../seeds/pilares.seed");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  normalizeName,
  normalizeText,
  parseBoundedText,
  parseObjectId,
  parseOptionalText,
  parsePagination,
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  const name = parseBoundedText(payload.name || payload.nome, "Nome", 120);
  const normalizedName = normalizeName(name);
  const existing = await Pilar.findOne({ normalizedName, status: ACTIVE_STATUS });
  if (existing) throw createHttpError("Pilar já cadastrado.", 409);

  const pilar = await Pilar.create({
    name,
    normalizedName,
    description: parseBoundedText(payload.description || payload.descricao, "Descrição", 4000, { required: false }) || null,
    status: ACTIVE_STATUS,
  });

  return serializePilar(pilar);
}

function parsePilarStatus(value) {
  const status = normalizeText(value || ACTIVE_STATUS);
  if (![ACTIVE_STATUS, "inativo"].includes(status)) throw createHttpError("Status deve ser ativo ou inativo.", 400);
  return status;
}

async function listPilares(authenticatedUserId, query = {}) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  await seedDefaultPilares();
  const filters = {};
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) {
    filters.status = ACTIVE_STATUS;
  } else {
    const status = query.status ? normalizeText(query.status) : "";
    if (status && !["todos", "all"].includes(status)) {
      filters.status = String(query.status).trim();
    } else if (!status) {
      filters.status = ACTIVE_STATUS;
    }
  }

  const search = parseOptionalText(query.search || query.q || query.nome || query.name, "Busca");
  if (search) {
    const searchRegex = new RegExp(escapeRegex(search), "i");
    filters.$or = [{ name: searchRegex }, { normalizedName: searchRegex }];
  }

  const { page, limit, skip } = parsePagination(query);
  const [total, pilares] = await Promise.all([
    Pilar.countDocuments(filters),
    Pilar.find(filters).sort({ name: 1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    pagination: buildPagination(total, page, limit),
    pilares: pilares.map(serializePilar),
  };
}

async function getPilar(authenticatedUserId, pilarId) {
  const user = await getAuthenticatedUser(authenticatedUserId);
  const id = parseObjectId(pilarId, "Pilar deve ser um identificador válido.");
  const filters = { _id: id };
  const isAdmin = ADMIN_ROLES.includes(normalizeText(user.role));
  if (!isAdmin) filters.status = ACTIVE_STATUS;
  const pilar = await Pilar.findOne(filters).lean();
  if (!pilar) throw createHttpError("Pilar não encontrado.", 404);
  const desafioFilters = { $or: [{ pilar: id }, { "pilares.pilar": id }] };
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

  if (payload.name !== undefined || payload.nome !== undefined) {
    const name = parseBoundedText(payload.name ?? payload.nome, "Nome", 120);
    updates.name = name;
    updates.normalizedName = normalizeName(name);
  }

  if (payload.description !== undefined || payload.descricao !== undefined) {
    updates.description = parseBoundedText(payload.description ?? payload.descricao, "Descrição", 4000, { required: false }) || null;
  }

  if (payload.status !== undefined) updates.status = parsePilarStatus(payload.status);
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
