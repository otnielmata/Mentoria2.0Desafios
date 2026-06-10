const mongoose = require("mongoose");
const Pilar = require("../models/pilar.model");
const User = require("../models/user.model");

const ACTIVE_STATUS = "ativo";
const FULL_ACCESS_ROLES = ["professor", "admin"];

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

function serializeDesafio(desafio) {
  if (!desafio || typeof desafio !== "object") {
    return desafio;
  }

  const serializedDesafio = {};

  if (desafio.id || desafio._id) {
    serializedDesafio.id = desafio.id || String(desafio._id);
  }

  if (desafio.title) {
    serializedDesafio.title = desafio.title;
  }

  if (desafio.name) {
    serializedDesafio.name = desafio.name;
  }

  if (desafio.description) {
    serializedDesafio.description = desafio.description;
  }

  if (desafio.status) {
    serializedDesafio.status = desafio.status;
  }

  return serializedDesafio;
}

function serializePilar(pilar) {
  const serializedPilar = {
    id: pilar.id || String(pilar._id),
    name: pilar.name,
    description: pilar.description || "",
    status: pilar.status,
    desafios: Array.isArray(pilar.desafios) ? pilar.desafios.map(serializeDesafio) : [],
  };

  return serializedPilar;
}

function assertValidPilarId(pilarId) {
  if (!mongoose.isValidObjectId(pilarId)) {
    throw createHttpError("Pilar não encontrado.", 404);
  }
}

async function getAuthenticatedUser(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  return authenticatedUser;
}

function buildPilarFilters(authenticatedUser, pilarId) {
  const role = normalizeRole(authenticatedUser.role);
  const filters = { _id: pilarId };

  if (!FULL_ACCESS_ROLES.includes(role)) {
    filters.status = ACTIVE_STATUS;
  }

  return filters;
}

async function getPilarById(authenticatedUserId, pilarId) {
  assertValidPilarId(pilarId);

  const authenticatedUser = await getAuthenticatedUser(authenticatedUserId);
  const filters = buildPilarFilters(authenticatedUser, pilarId);
  const pilar = await Pilar.findOne(filters).lean();

  if (!pilar) {
    throw createHttpError("Pilar não encontrado.", 404);
  }

  return serializePilar(pilar);
}

module.exports = {
  getPilarById,
};
