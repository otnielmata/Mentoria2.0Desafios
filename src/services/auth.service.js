const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { generateToken } = require("./token.service");
const { logInvalidLoginAttempt } = require("./audit.service");
const AppError = require("../errors/app-error");

function getInvalidCredentialsError() {
  return new AppError("Credenciais inválidas.", {
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
  });
}

async function registerUser({ name, email, password }) {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("E-mail já está em uso.");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  const token = generateToken({ sub: user.id, email: user.email });

  return {
    user: { id: user.id, name: user.name, email: user.email },
    token,
  };
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
    throw new AppError("Dados de validação inválidos.", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
    });
  }
}

async function loginUser({ email, password, metadata = {} }) {
  validateLoginPayload({ email, password });
  const normalizedEmail = email.trim().toLowerCase();
  const { ip, userAgent } = metadata;

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    await logInvalidLoginAttempt({
      email: normalizedEmail,
      reason: "user_not_found",
      ip,
      userAgent,
    });
    throw getInvalidCredentialsError();
  }

  if (user.status !== "active") {
    await logInvalidLoginAttempt({
      email: normalizedEmail,
      reason: "inactive_user",
      ip,
      userAgent,
    });
    throw getInvalidCredentialsError();
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    await logInvalidLoginAttempt({
      email: normalizedEmail,
      reason: "invalid_password",
      ip,
      userAgent,
    });
    throw getInvalidCredentialsError();
  }

  const token = generateToken({ sub: user.id, email: user.email });

  return {
    user: { id: user.id, name: user.name, email: user.email },
    token,
  };
}

module.exports = {
  registerUser,
  loginUser,
};
