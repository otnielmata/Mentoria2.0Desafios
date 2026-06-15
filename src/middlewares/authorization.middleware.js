const User = require("../models/user.model");

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
}

async function resolveAuthenticatedRole(req) {
  const tokenRole = normalizeRole(req.user && req.user.role);

  if (tokenRole) {
    return tokenRole;
  }

  const user = await User.findById(req.user.id);
  const role = normalizeRole(user && user.role);

  if (user) {
    req.user.role = role;
    req.user.status = user.status;
  }

  return role;
}

function authorizeRoles(allowedRoles = []) {
  const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

  return async (req, res, next) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Usuário não autenticado." });
    }

    try {
      const role = await resolveAuthenticatedRole(req);

      if (!normalizedAllowedRoles.includes(role)) {
        return res.status(403).json({ message: "Acesso não autorizado para este perfil." });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  authorizeRoles,
  normalizeRole,
  resolveAuthenticatedRole,
};
