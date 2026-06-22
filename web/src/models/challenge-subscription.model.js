function getSubscriptionMode(inscricao) {
  return String((inscricao && (inscricao.modalidade || (inscricao.grupo && inscricao.grupo.modalidade))) || "normal").toLowerCase();
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
};
