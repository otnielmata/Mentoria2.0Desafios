const Desafio = require("../models/desafio.model");
const { getEndOfDayInSaoPaulo, getStartOfDayInSaoPaulo } = require("../config/timezone");

const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const DEFAULT_INTERVAL_MS = 60 * 1000;

function getDeliveryDeadline(deliveryDate) {
  if (!deliveryDate) return null;
  return getEndOfDayInSaoPaulo(deliveryDate);
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
      deliveryDate: { $ne: null, $lt: getStartOfDayInSaoPaulo(now) },
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
