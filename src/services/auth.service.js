const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { logInvalidLoginAttempt } = require("./audit.service");
const { createHttpError, normalizeText } = require("./domain-utils");
const { generateToken } = require("./token.service");

const ACTIVE_STATUSES = ["ativo", "active"];

function validateRegistrationPayload({ name, email, password }) {
  const details = [];

  if (!name || typeof name !== "string" || !name.trim()) {
    details.push({ field: "name", message: "Nome é obrigatório." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
    details.push({ field: "email", message: "E-mail inválido." });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    details.push({ field: "password", message: "Senha deve ter ao menos 6 caracteres." });
  }

  if (details.length > 0) {
    throw createHttpError("Dados de validação inválidos.", 400, {
      code: "VALIDATION_ERROR",
      details,
    });
  }
}

function validateLoginPayload({ email, password }) {
  const details = [];

  if (!email || typeof email !== "string" || !email.trim()) {
    details.push({ field: "email", message: "E-mail é obrigatório." });
  }

  if (!password || typeof password !== "string" || !password.trim()) {
    details.push({ field: "password", message: "Senha é obrigatória." });
  }

  if (details.length > 0) {
    throw createHttpError("Dados de validação inválidos.", 400, {
      code: "VALIDATION_ERROR",
      details,
    });
  }
}

function invalidCredentialsError() {
  return createHttpError("Credenciais inválidas.", 401, { code: "INVALID_CREDENTIALS" });
}

function serializeAuthUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || User.userRoles.student,
    status: user.status || User.userStatuses.active,
  };
}

function isActiveUser(user) {
  return ACTIVE_STATUSES.includes(normalizeText(user && user.status));
}

function generateUserToken(user) {
  const safeUser = serializeAuthUser(user);

  return generateToken({
    email: safeUser.email,
    role: safeUser.role,
    status: safeUser.status,
    sub: safeUser.id,
  });
}

async function registerUser({ name, email, password }) {
  validateRegistrationPayload({ name, email, password });
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw createHttpError("E-mail já está em uso.", 409, { code: "EMAIL_ALREADY_IN_USE" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role: "aluno",
    status: "ativo",
  });

  const token = generateUserToken(user);

  return {
    user: serializeAuthUser(user),
    token,
  };
}

async function loginUser({ email, password, metadata = {} }) {
  validateLoginPayload({ email, password });
  const normalizedEmail = email.trim().toLowerCase();
  const { ip, userAgent } = metadata;

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    await logInvalidLoginAttempt({ email: normalizedEmail, reason: "user_not_found", ip, userAgent });
    throw invalidCredentialsError();
  }

  if (!isActiveUser(user)) {
    await logInvalidLoginAttempt({ email: normalizedEmail, reason: "inactive_user", ip, userAgent });
    throw invalidCredentialsError();
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    await logInvalidLoginAttempt({ email: normalizedEmail, reason: "invalid_password", ip, userAgent });
    throw invalidCredentialsError();
  }

  const token = generateUserToken(user);

  return {
    user: serializeAuthUser(user),
    token,
  };
}

module.exports = {
  generateUserToken,
  registerUser,
  loginUser,
  serializeAuthUser,
};
