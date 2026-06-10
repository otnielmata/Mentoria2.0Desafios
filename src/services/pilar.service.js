const Pilar = require("../models/pilar.model");
const User = require("../models/user.model");

const ALLOWED_CREATOR_ROLES = ["professor", "admin"];
const ACTIVE_STATUS = "ativo";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hasOwn(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload, field);
}

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function normalizeName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function assertObjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError("Corpo da requisição deve ser um objeto JSON.", 400);
  }
}

function parseRequiredName(payload) {
  if (!hasOwn(payload, "name") || typeof payload.name !== "string" || payload.name.trim().length === 0) {
    throw createHttpError("Nome é obrigatório.", 400);
  }

  return payload.name.trim().replace(/\s+/g, " ");
}

function parseOptionalDescription(payload) {
  if (!hasOwn(payload, "description") || payload.description === null || payload.description === "") {
    return undefined;
  }

  if (typeof payload.description !== "string") {
    throw createHttpError("Descrição deve ser um texto válido.", 400);
  }

  const description = payload.description.trim();
  return description.length > 0 ? description : undefined;
}

function serializePilar(pilar) {
  const serializedPilar = {
    id: pilar.id || String(pilar._id),
    name: pilar.name,
    status: pilar.status,
  };

  if (pilar.description) {
    serializedPilar.description = pilar.description;
  }

  return serializedPilar;
}

async function assertCanCreatePilar(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_CREATOR_ROLES.includes(normalizeRole(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode cadastrar pilares.", 403);
  }
}

async function createPilar(authenticatedUserId, payload = {}) {
  assertObjectPayload(payload);
  await assertCanCreatePilar(authenticatedUserId);

  const name = parseRequiredName(payload);
  const normalizedName = normalizeName(name);
  const description = parseOptionalDescription(payload);

  const existingActivePilar = await Pilar.findOne({
    normalizedName,
    status: ACTIVE_STATUS,
  });

  if (existingActivePilar) {
    throw createHttpError("Já existe um pilar ativo com este nome.", 409);
  }

  try {
    const pilar = await Pilar.create({
      name,
      normalizedName,
      description,
      status: ACTIVE_STATUS,
    });

    return serializePilar(pilar);
  } catch (error) {
    if (error && error.code === 11000) {
      throw createHttpError("Já existe um pilar ativo com este nome.", 409);
    }

    throw error;
  }
}

module.exports = {
  createPilar,
};
