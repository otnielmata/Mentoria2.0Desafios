const AuthAttempt = require("../models/auth-attempt.model");

async function logInvalidLoginAttempt({ email, reason, ip, userAgent }) {
  try {
    await AuthAttempt.create({
      email: String(email || "").trim().toLowerCase(),
      reason,
      ip: ip || null,
      userAgent: userAgent || null,
    });
  } catch (error) {
    // Audit failure must not block authentication.
    console.error("Falha ao registrar tentativa inválida de login:", error);
  }
}

module.exports = {
  logInvalidLoginAttempt,
};
