const User = require("../models/user.model");
const { createHttpError, getEntityId, parseOptionalText } = require("./domain-utils");

const FORBIDDEN_FIELDS = ["role", "status", "password", "passwordHash", "turmas"];

function serializeUser(user) {
  return {
    id: getEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    turmas: Array.isArray(user.turmas) ? user.turmas.map(getEntityId) : [],
  };
}

async function getMe(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId).populate("turmas").lean();
  if (!user) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  return serializeUser(user);
}

async function updateMe(authenticatedUserId, payload = {}) {
  const updates = {};

  FORBIDDEN_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      throw createHttpError(`Campo ${field} não pode ser alterado neste endpoint.`, 400);
    }
  });

  const name = parseOptionalText(payload.name, "Nome");
  if (name) updates.name = name;

  const email = parseOptionalText(payload.email, "E-mail");
  if (email) updates.email = email.toLowerCase();

  const user = await User.findByIdAndUpdate(authenticatedUserId, updates, { new: true }).lean();
  if (!user) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  return serializeUser(user);
}

module.exports = {
  getMe,
  updateMe,
};
