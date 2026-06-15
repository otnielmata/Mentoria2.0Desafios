const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { createHttpError, getEntityId, parseOptionalText } = require("./domain-utils");

const FORBIDDEN_FIELDS = ["role", "status", "passwordHash", "turmas"];

function serializeTurma(turma) {
  if (!turma) {
    return null;
  }

  if (typeof turma !== "object") {
    return { id: getEntityId(turma) };
  }

  return {
    id: getEntityId(turma),
    name: turma.name,
    code: turma.code,
    status: turma.status,
  };
}

function serializeUser(user) {
  return {
    id: getEntityId(user),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    turmas: Array.isArray(user.turmas) ? user.turmas.map(serializeTurma) : [],
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
  const currentUser = await User.findById(authenticatedUserId).lean();
  if (!currentUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  FORBIDDEN_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      throw createHttpError(`Campo ${field} não pode ser alterado neste endpoint.`, 400);
    }
  });

  const name = parseOptionalText(payload.name, "Nome");
  if (name) updates.name = name;

  const email = parseOptionalText(payload.email, "E-mail");
  if (email) {
    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail !== currentUser.email) {
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: authenticatedUserId } }).lean();
      if (existingUser) throw createHttpError("E-mail já está em uso.", 409, { code: "EMAIL_ALREADY_IN_USE" });
    }
    updates.email = normalizedEmail;
  }

  const newPassword = parseOptionalText(payload.password || payload.newPassword || payload.novaSenha, "Senha");
  if (newPassword) {
    if (newPassword.length < 6) {
      throw createHttpError("Senha deve ter ao menos 6 caracteres.", 400, {
        code: "VALIDATION_ERROR",
        details: [{ field: "password", message: "Senha deve ter ao menos 6 caracteres." }],
      });
    }

    const currentPassword = parseOptionalText(payload.currentPassword || payload.senhaAtual, "Senha atual");
    if (!currentPassword) {
      throw createHttpError("Senha atual é obrigatória para alterar a senha.", 400, {
        code: "VALIDATION_ERROR",
        details: [{ field: "currentPassword", message: "Informe a senha atual." }],
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.passwordHash);
    if (!isCurrentPasswordValid) {
      throw createHttpError("Senha atual inválida.", 401, { code: "INVALID_CURRENT_PASSWORD" });
    }

    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  const user = await User.findByIdAndUpdate(authenticatedUserId, updates, { new: true }).lean();

  return serializeUser(user);
}

module.exports = {
  getMe,
  updateMe,
};
