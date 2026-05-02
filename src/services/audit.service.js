const AuthAttempt = require("../models/auth-attempt.model");

async function logInvalidLoginAttempt({ email, reason, ip, userAgent }) {
  try {
    await AuthAttempt.create({
      email: String(email || "").trim().toLowerCase(),
      reason,
      ip,
      userAgent,
    });
  } catch (error) {
    // Audit should not block authentication flow.
    console.error("Failed to persist auth attempt:", error);
  }
}

module.exports = {
  logInvalidLoginAttempt,
};
