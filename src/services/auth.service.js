const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { generateToken } = require("./token.service");

function getSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || User.userRoles.student,
    status: user.status || User.userStatuses.active,
  };
}

function ensureActiveUser(user) {
  const status = user.status || User.userStatuses.active;

  if (status !== User.userStatuses.active) {
    const error = new Error("Usuário inativo.");
    error.statusCode = 403;
    throw error;
  }
}

function generateUserToken(user) {
  const safeUser = getSafeUser(user);

  return generateToken({
    email: safeUser.email,
    role: safeUser.role,
    status: safeUser.status,
    sub: safeUser.id,
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

  const token = generateUserToken(user);

  return {
    user: getSafeUser(user),
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

  ensureActiveUser(user);

  const token = generateUserToken(user);

  return {
    user: getSafeUser(user),
    token,
  };
}

module.exports = {
  getSafeUser,
  registerUser,
  loginUser,
};
