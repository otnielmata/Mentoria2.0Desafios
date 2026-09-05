const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const {
  createHttpError,
  getEntityId,
  hasOwn,
  parseEmail,
  parsePassword,
  parsePersonName,
} = require("./domain-utils");

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

  if (hasOwn(payload, "name")) updates.name = parsePersonName(payload.name);

  if (hasOwn(payload, "email")) {
    const normalizedEmail = parseEmail(payload.email);
    if (normalizedEmail !== currentUser.email) {
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: authenticatedUserId } }).lean();
      if (existingUser) throw createHttpError("E-mail já está em uso.", 409, { code: "EMAIL_ALREADY_IN_USE" });
    }
    updates.email = normalizedEmail;
  }

  const rawNewPassword = hasOwn(payload, "password")
    ? payload.password
    : hasOwn(payload, "newPassword")
      ? payload.newPassword
      : payload.novaSenha;
  const newPassword = rawNewPassword === undefined || rawNewPassword === null || rawNewPassword === "" ? undefined : parsePassword(rawNewPassword);
  let shouldRotateSession = false;
  if (newPassword) {
    const rawCurrentPassword = hasOwn(payload, "currentPassword") ? payload.currentPassword : payload.senhaAtual;
    if (typeof rawCurrentPassword !== "string" || rawCurrentPassword.trim().length === 0) {
      throw createHttpError("Senha atual é obrigatória para alterar a senha.", 400, {
        code: "VALIDATION_ERROR",
        details: [{ field: "currentPassword", message: "Informe a senha atual." }],
      });
    }
    const currentPassword = rawCurrentPassword;

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.passwordHash);
    if (!isCurrentPasswordValid) {
      throw createHttpError("Senha atual inválida.", 401, { code: "INVALID_CURRENT_PASSWORD" });
    }

    if (newPassword === currentPassword || (await bcrypt.compare(newPassword, currentUser.passwordHash))) {
      throw createHttpError("A nova senha deve ser diferente da senha atual.", 400, {
        code: "SAME_PASSWORD",
        details: [{ field: "newPassword", message: "Escolha uma senha diferente da atual." }],
      });
    }

    updates.passwordHash = await bcrypt.hash(newPassword, 10);
    shouldRotateSession = true;
  }

  if (shouldRotateSession) {
    updates.authVersion = Number(currentUser.authVersion || 0) + 1;
  }

  if (Object.keys(updates).length === 0) {
    throw createHttpError("Informe ao menos uma alteração para salvar.", 400, {
      code: "NO_CHANGES",
    });
  }

  const user = await User.findByIdAndUpdate(authenticatedUserId, updates, { new: true }).lean();

  return serializeUser(user);
}

module.exports = {
  getMe,
  updateMe,
};
