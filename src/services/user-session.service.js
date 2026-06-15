const User = require("../models/user.model");

function createHttpError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeSessionUser(user = {}) {
  return {
    email: user.email,
    id: String(user.id || user._id || ""),
    name: user.name,
    role: user.role || User.userRoles.student,
    status: user.status || User.userStatuses.active,
  };
}

async function getAuthenticatedUserSession(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId)
    .select("name email role status")
    .lean();

  if (!user) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  return {
    user: sanitizeSessionUser(user),
  };
}

module.exports = {
  getAuthenticatedUserSession,
  sanitizeSessionUser,
};
