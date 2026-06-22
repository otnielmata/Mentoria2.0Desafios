function getSubscriptionMode(inscricao) {
  return String((inscricao && (inscricao.modalidade || (inscricao.grupo && inscricao.grupo.modalidade))) || "normal").toLowerCase();
}

function isChallengeActive(desafio, now = new Date()) {
  if (!desafio || String(desafio.status || "").toLowerCase() !== "ativo") return false;
  const deliveryDate = desafio.deliveryDate || desafio.dataEntrega;
  if (!deliveryDate) return true;
  const deadline = new Date(deliveryDate);
  if (Number.isNaN(deadline.getTime())) return false;
  deadline.setUTCHours(23, 59, 59, 999);
  return deadline >= now;
}

function getSubscriptionActionState(inscricao) {
  const isSubscribed = Boolean(inscricao);
  const modalidade = getSubscriptionMode(inscricao);

  return {
    isSubscribed,
    actionDisabled: isSubscribed,
    modalidade,
    showNormal: !isSubscribed || modalidade === "normal",
    showEnglish: !isSubscribed || modalidade === "ingles",
  };
}

module.exports = {
  getSubscriptionActionState,
  getSubscriptionMode,
  isChallengeActive,
};
