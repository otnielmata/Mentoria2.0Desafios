const Desafio = require("../models/desafio.model");

const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const DEFAULT_INTERVAL_MS = 60 * 1000;

function getStartOfUtcDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function getDeliveryDeadline(deliveryDate) {
  if (!deliveryDate) return null;
  const deadline = deliveryDate instanceof Date ? new Date(deliveryDate) : new Date(deliveryDate);
  if (Number.isNaN(deadline.getTime())) return null;
  deadline.setUTCHours(23, 59, 59, 999);
  return deadline;
}

function isDeliveryDeadlineExpired(desafio, now = new Date()) {
  const deadline = getDeliveryDeadline(desafio && desafio.deliveryDate);
  return Boolean(deadline && deadline < now);
}

function getEffectiveChallengeStatus(desafio, now = new Date()) {
  if (desafio && desafio.status === ACTIVE_STATUS && isDeliveryDeadlineExpired(desafio, now)) {
    return INACTIVE_STATUS;
  }
  return desafio && desafio.status;
}

async function inactivateExpiredChallenges(now = new Date()) {
  return Desafio.updateMany(
    {
      status: ACTIVE_STATUS,
      deliveryDate: { $ne: null, $lt: getStartOfUtcDay(now) },
    },
    { status: INACTIVE_STATUS }
  );
}

function startChallengeDeadlineScheduler({ intervalMs = DEFAULT_INTERVAL_MS } = {}) {
  const timer = setInterval(() => {
    inactivateExpiredChallenges().catch((error) => {
      console.error("Falha ao inativar desafios com prazo encerrado:", error);
    });
  }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

module.exports = {
  getDeliveryDeadline,
  getEffectiveChallengeStatus,
  inactivateExpiredChallenges,
  isDeliveryDeadlineExpired,
  startChallengeDeadlineScheduler,
};
