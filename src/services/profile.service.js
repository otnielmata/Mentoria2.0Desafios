const User = require("../models/user.model");

const EDITABLE_FIELDS = ["name", "email"];
const FORBIDDEN_FIELDS = ["role", "status", "password", "passwordHash"];

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hasOwn(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload, field);
}

function assertObjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError("Corpo da requisição deve ser um objeto JSON.", 400);
  }
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

function assertForbiddenFields(payload) {
  const sentForbiddenFields = FORBIDDEN_FIELDS.filter((field) => hasOwn(payload, field));

  if (sentForbiddenFields.length > 0) {
    throw createHttpError(
      `Campos protegidos não podem ser alterados: ${sentForbiddenFields.join(", ")}.`,
      400
    );
  }
}

function buildEditablePayload(payload) {
  const updates = {};

  if (hasOwn(payload, "name")) {
    if (typeof payload.name !== "string" || payload.name.trim().length === 0) {
      throw createHttpError("Nome deve ser um texto não vazio.", 400);
    }

    updates.name = payload.name.trim();
  }

  if (hasOwn(payload, "email")) {
    if (typeof payload.email !== "string" || payload.email.trim().length === 0) {
      throw createHttpError("E-mail deve ser um texto não vazio.", 400);
    }

    updates.email = payload.email.trim().toLowerCase();
  }

  return updates;
}

async function updateAuthenticatedUser(userId, payload = {}) {
  assertObjectPayload(payload);
  assertForbiddenFields(payload);

  const updates = buildEditablePayload(payload);
  if (Object.keys(updates).length === 0) {
    throw createHttpError(`Informe pelo menos um campo editável: ${EDITABLE_FIELDS.join(", ")}.`, 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (updates.email && updates.email !== user.email) {
    const existingUser = await User.findOne({ email: updates.email });

    if (existingUser && String(existingUser.id) !== String(user.id)) {
      throw createHttpError("E-mail já está em uso.", 409);
    }
  }

  Object.assign(user, updates);

  try {
    const savedUser = await user.save();
    return serializeUser(savedUser);
  } catch (error) {
    if (error && error.code === 11000) {
      throw createHttpError("E-mail já está em uso.", 409);
    }

    throw error;
  }
}

module.exports = {
  updateAuthenticatedUser,
};
