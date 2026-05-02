const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { generateToken } = require("./token.service");
const AppError = require("../errors/app-error");

function validateRegistrationPayload({ name, email, password }) {
  const details = [];

  if (!name || typeof name !== "string" || !name.trim()) {
    details.push({ field: "name", message: "Nome é obrigatório." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    details.push({ field: "email", message: "E-mail inválido." });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    details.push({
      field: "password",
      message: "Senha deve ter ao menos 6 caracteres.",
    });
  }

  if (details.length > 0) {
    throw new AppError("Dados de validação inválidos.", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      details,
    });
  }
}

async function registerUser({ name, email, password }) {
  validateRegistrationPayload({ name, email, password });
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError("E-mail já está em uso.", {
      statusCode: 409,
      code: "EMAIL_ALREADY_IN_USE",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    status: "active",
  });

  const token = generateToken({ sub: user.id, email: user.email });

  return {
    user: { id: user.id, name: user.name, email: user.email, status: user.status },
    token,
  };
}

async function loginUser({ email, password }) {
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error("Credenciais inválidas.");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error("Credenciais inválidas.");
    error.statusCode = 401;
    throw error;
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
