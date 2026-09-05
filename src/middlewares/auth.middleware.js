const { verifyToken } = require("../services/token.service");
const User = require("../models/user.model");

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não informado.", code: "AUTHENTICATION_REQUIRED" });
  }

  const token = authHeader.split(" ")[1];

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado.", code: "TOKEN_INVALID" });
  }

  try {
    const user = await User.findById(payload.sub).lean();

    if (!user) {
      return res.status(401).json({ message: "Sessão inválida. Faça login novamente.", code: "SESSION_INVALID" });
    }

    if (normalizeText(user.status) !== "ativo") {
      return res.status(401).json({ message: "Usuário inativo. Faça login com um usuário ativo.", code: "INACTIVE_USER" });
    }

    if (Number(payload.authVersion || 0) !== Number(user.authVersion || 0)) {
      return res.status(401).json({ message: "Sua sessão foi atualizada. Faça login novamente.", code: "SESSION_REVOKED" });
    }

    req.user = {
      email: user.email,
      id: String(user._id),
      role: user.role,
      status: user.status,
      authVersion: Number(user.authVersion || 0),
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authMiddleware;
