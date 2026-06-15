const AuditEvent = require("../models/audit-event.model");
const AuthAttempt = require("../models/auth-attempt.model");

const SENSITIVE_KEYS = new Set([
  "accessToken",
  "authorization",
  "hash",
  "password",
  "passwordHash",
  "refreshToken",
  "secret",
  "token",
]);

function isSensitiveKey(key) {
  return SENSITIVE_KEYS.has(String(key || "").trim());
}

function sanitizeMetadata(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeMetadata);
  }

  if (!value || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !isSensitiveKey(key))
      .map(([key, fieldValue]) => [key, sanitizeMetadata(fieldValue)])
  );
}

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

async function logDomainEvent({
  eventType,
  actor = null,
  aluno = null,
  desafio = null,
  envio = null,
  turma = null,
  pontuacao = null,
  statusAnterior = null,
  statusNovo = null,
  feedback = null,
  metadata = {},
  occurredAt = new Date(),
}) {
  try {
    await AuditEvent.create({
      eventType,
      actor,
      aluno,
      desafio,
      envio,
      turma,
      pontuacao,
      statusAnterior,
      statusNovo,
      feedback,
      metadata: sanitizeMetadata(metadata),
      occurredAt,
    });
  } catch (error) {
    // Audit failure must not block core business flows.
    console.error("Falha ao registrar evento de auditoria:", error);
  }
}

module.exports = {
  logDomainEvent,
  logInvalidLoginAttempt,
  sanitizeMetadata,
};
