const { getEndOfDayInSaoPaulo, parseDateInSaoPaulo } = require("../lib/timezone");

function getSubscriptionMode(inscricao) {
  return String((inscricao && (inscricao.modalidade || (inscricao.grupo && inscricao.grupo.modalidade))) || "normal").toLowerCase();
}

function getNamedParticipants(items = []) {
  const participants = new Map();

  items.forEach((participant) => {
    if (!participant || typeof participant !== "object") return;
    const name = String(participant.name || participant.nome || "").trim();
    if (!name) return;
    const key = String(participant.id || participant._id || participant.email || name).toLowerCase();
    if (!participants.has(key)) participants.set(key, name);
  });

  return Array.from(participants.values());
}

function getGroupParticipantNames(inscricao) {
  return getNamedParticipants((inscricao && inscricao.grupo && inscricao.grupo.participantes) || []);
}

function getSubmissionParticipants(envio) {
  if (!envio) return [];
  const participants = new Map();
  const candidates = [
    envio.aluno,
    envio.responsavel,
    envio.lider,
    ...(Array.isArray(envio.participantesDetalhes) ? envio.participantesDetalhes : []),
    ...(Array.isArray(envio.participantes) ? envio.participantes : []),
  ];

  candidates.forEach((participant) => {
    if (!participant || typeof participant !== "object") return;
    const name = String(participant.name || participant.nome || "").trim();
    if (!name) return;
    const key = String(participant.id || participant._id || participant.email || name).toLowerCase();
    if (!participants.has(key)) participants.set(key, participant);
  });

  return Array.from(participants.values());
}

function getSubmissionParticipantNames(envio) {
  if (!envio) return [];
  return getNamedParticipants([
    envio.aluno,
    envio.responsavel,
    envio.lider,
    ...getSubmissionParticipants(envio),
  ]);
}

function isChallengeActive(desafio, now = new Date()) {
  if (!desafio || String(desafio.status || "").toLowerCase() !== "ativo") return false;
  const deliveryDate = desafio.deliveryDate || desafio.dataEntrega;
  if (!deliveryDate) return true;
  const deadline = getEndOfDayInSaoPaulo(parseDateInSaoPaulo(deliveryDate));
  if (!deadline || Number.isNaN(deadline.getTime())) return false;
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
  getGroupParticipantNames,
  getSubmissionParticipants,
  getSubmissionParticipantNames,
  getSubscriptionActionState,
  getSubscriptionMode,
  isChallengeActive,
};
