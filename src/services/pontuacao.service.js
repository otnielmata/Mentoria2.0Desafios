const EnvioDesafio = require("../models/envio-desafio.model");
const ParticipanteEnvio = require("../models/participante-envio.model");
const Pontuacao = require("../models/pontuacao.model");
const { logDomainEvent } = require("./audit.service");
const { isLeadershipBonusEnabled } = require("./configuration.service");
const { createHttpError, getEntityId, normalizeText } = require("./domain-utils");

const APPROVED_STATUS = "aprovado";
const GROUP_TYPE = "grupo";
const RECURRENCE_PERIODS = ["diario", "semanal", "mensal"];

function shouldApplyLeadershipBonus() {
  // O MVP expõe a configuração, mas não aplica bônus até existir regra de edição segura.
  return isLeadershipBonusEnabled() && false;
}

function normalizeEvidenceItem(evidence) {
  if (evidence === undefined || evidence === null) {
    return "";
  }

  if (typeof evidence === "string") {
    return evidence.trim().toLowerCase();
  }

  if (typeof evidence === "object") {
    const value =
      evidence.url ||
      evidence.link ||
      evidence.text ||
      evidence.texto ||
      evidence.file ||
      evidence.filename ||
      evidence.name ||
      evidence.nome ||
      JSON.stringify(evidence);

    return String(value || "").trim().toLowerCase();
  }

  return String(evidence).trim().toLowerCase();
}

function normalizeEvidenceList(evidencias = []) {
  const values = Array.isArray(evidencias) ? evidencias : [evidencias];

  return values.map(normalizeEvidenceItem).filter(Boolean);
}

async function getScoreRecipients(envio) {
  const recipients = [getEntityId(envio.aluno)];

  if (normalizeText(envio.type) === GROUP_TYPE) {
    const links = await ParticipanteEnvio.find({ envio: getEntityId(envio), status: "ativo" }).lean();
    (links || []).forEach((link) => recipients.push(getEntityId(link.aluno)));
    (envio.participantes || []).forEach((participante) => recipients.push(getEntityId(participante)));
  }

  return [...new Set(recipients.filter(Boolean))];
}

async function assertNoDuplicateEvidenceScore(envio, desafio, alunos) {
  const envioId = getEntityId(envio);
  const desafioId = getEntityId(desafio);
  const evidencias = normalizeEvidenceList(envio.evidencias);

  if (evidencias.length === 0) {
    throw createHttpError("Evidência é obrigatória para aprovação.", 400);
  }

  const approvedEnvios = await EnvioDesafio.find({
    _id: { $ne: envioId },
    desafio: desafioId,
    status: APPROVED_STATUS,
  }).lean();
  const duplicatedEnvioIds = (approvedEnvios || [])
    .filter((approvedEnvio) => {
      const approvedEvidencias = new Set(normalizeEvidenceList(approvedEnvio.evidencias));

      return evidencias.some((evidence) => approvedEvidencias.has(evidence));
    })
    .map(getEntityId);

  if (duplicatedEnvioIds.length === 0) {
    return;
  }

  const duplicatePontuacoes = await Pontuacao.find({
    aluno: { $in: alunos },
    desafio: desafioId,
    envio: { $in: duplicatedEnvioIds },
  }).lean();

  if ((duplicatePontuacoes || []).length > 0) {
    throw createHttpError("Pontuação duplicada para a mesma evidência neste desafio.", 409, {
      code: "DUPLICATE_EVIDENCE_SCORE",
      details: [{ field: "evidencias", message: "Esta evidência já gerou pontuação para aluno do envio." }],
    });
  }
}

function assertApprovedEnvio(envio) {
  if (normalizeText(envio.status) !== APPROVED_STATUS) {
    throw createHttpError("Pontuação só pode ser gerada para envio aprovado.", 400);
  }
}

function getPeriodBounds(referenceDate, periodo) {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate || Date.now());
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);

  if (periodo === "semanal") {
    const day = start.getUTCDay() || 7;
    start.setUTCDate(start.getUTCDate() - day + 1);
    end.setTime(start.getTime());
    end.setUTCDate(end.getUTCDate() + 7);
    return { start, end };
  }

  if (periodo === "mensal") {
    start.setUTCDate(1);
    end.setTime(start.getTime());
    end.setUTCMonth(end.getUTCMonth() + 1);
    return { start, end };
  }

  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function getRecurrenceLimit(desafio) {
  const recorrencia = desafio.recorrencia || desafio.recurrence || {};
  const rawLimitePontos =
    recorrencia.limitePontos ??
    recorrencia.limite_pontos ??
    recorrencia.limitePontosPeriodo ??
    recorrencia.limite_pontos_periodo ??
    recorrencia.limitePontuacaoPeriodo ??
    recorrencia.limite_pontuacao_periodo ??
    recorrencia.maxPointsPerPeriod ??
    desafio.limitePontosPeriodo ??
    desafio.limite_pontos_periodo ??
    desafio.limitePontuacaoPeriodo ??
    desafio.limite_pontuacao_periodo ??
    desafio.maxPointsPerPeriod;
  const enabled =
    recorrencia.enabled === true || recorrencia.ativo === true || desafio.recorrente === true || desafio.isRecurring === true || rawLimitePontos !== undefined;
  const periodo = normalizeText(
    recorrencia.periodo || recorrencia.period || desafio.periodoRecorrencia || desafio.recurrencePeriod || "mensal"
  );
  const limitePontos = Number(rawLimitePontos);

  if (!enabled || !Number.isFinite(limitePontos) || limitePontos <= 0) {
    return null;
  }

  return {
    periodo: RECURRENCE_PERIODS.includes(periodo) ? periodo : "mensal",
    limitePontos,
    acaoAoExceder: "bloquear",
  };
}

function getLivePresentationBonusPoints(desafio, enabled) {
  if (!enabled) return 0;
  const pontos = Number(desafio.livePresentationPoints || desafio.pontosApresentacaoAoVivo || desafio.presentationPoints || 0);
  return Number.isFinite(pontos) && pontos > 0 ? pontos : 0;
}

function getChallengePillarPoints(desafio = {}) {
  const configured = Array.isArray(desafio.pilares)
    ? desafio.pilares
        .map((item) => {
          const pilar = item && (item.pilar || item.pilarId || item.id);
          const pontos = Number(item && (item.points || item.pontos || item.pontuacao || item.pontuação));
          return pilar && Number.isFinite(pontos) && pontos > 0
            ? {
                pilar: getEntityId(pilar),
                pontos,
              }
            : null;
        })
        .filter(Boolean)
    : [];

  if (configured.length > 0) return configured;

  const legacyPilar = desafio.pilar || desafio.pilarId;
  const legacyPoints = Number(desafio.points || desafio.pontos || 0);
  if (!legacyPilar || !Number.isFinite(legacyPoints) || legacyPoints <= 0) return [];

  return [{ pilar: getEntityId(legacyPilar), pontos: legacyPoints }];
}

function getChallengeBasePoints(desafio = {}) {
  const pontosPorPilar = getChallengePillarPoints(desafio);
  const total = pontosPorPilar.reduce((sum, item) => sum + Number(item.pontos || 0), 0);
  if (total > 0) return total;

  const legacyPoints = Number(desafio.points || desafio.pontos || 0);
  return Number.isFinite(legacyPoints) && legacyPoints > 0 ? legacyPoints : 0;
}

async function assertRecurringScoreLimit(envio, desafio, alunos, referenceDate = new Date(), options = {}) {
  const recurrence = getRecurrenceLimit(desafio);
  if (!recurrence) {
    return null;
  }

  const envioId = getEntityId(envio);
  const desafioId = getEntityId(desafio);
  const pontos = Number(options.pontosSolicitados ?? getChallengeBasePoints(desafio));
  const { start, end } = getPeriodBounds(referenceDate, recurrence.periodo);
  const existingPontuacoes = await Pontuacao.find({
    envio: { $ne: envioId },
    desafio: desafioId,
    aluno: { $in: alunos },
    createdAt: { $gte: start, $lt: end },
  }).lean();
  const pontosPorAluno = new Map();

  (existingPontuacoes || []).forEach((pontuacao) => {
    const alunoId = getEntityId(pontuacao.aluno);
    pontosPorAluno.set(alunoId, (pontosPorAluno.get(alunoId) || 0) + Number(pontuacao.pontos || 0));
  });

  const excedidos = alunos
    .map((alunoId) => ({
      alunoId,
      pontosAtuais: pontosPorAluno.get(alunoId) || 0,
      pontosSolicitados: pontos,
      limitePontos: recurrence.limitePontos,
    }))
    .filter((item) => item.pontosAtuais + item.pontosSolicitados > item.limitePontos);

  if (excedidos.length > 0) {
    throw createHttpError("Limite de pontuação recorrente excedido para este desafio.", 409, {
      code: "RECURRENCE_SCORE_LIMIT_EXCEEDED",
      details: excedidos.map((item) => ({
        field: "recorrencia.limitePontos",
        message: "Aluno excede o limite de pontos permitido no período.",
        ...item,
        periodo: recurrence.periodo,
        periodoInicio: start.toISOString(),
        periodoFim: end.toISOString(),
      })),
    });
  }

  return {
    periodo: recurrence.periodo,
    limitePontos: recurrence.limitePontos,
    periodoInicio: start,
    periodoFim: end,
  };
}

async function logPontuacoesGeradas(envio, desafio, pontuacoes) {
  await Promise.all(
    pontuacoes.map((pontuacao) =>
      logDomainEvent({
        eventType: "pontuacao_gerada",
        actor: envio.approvedBy || envio.evaluatedBy || null,
        aluno: pontuacao.aluno,
        desafio: pontuacao.desafio,
        envio: pontuacao.envio,
        turma: envio.turma || null,
        statusNovo: APPROVED_STATUS,
        metadata: {
          pontos: pontuacao.pontos,
          motivo: pontuacao.motivo,
          source: pontuacao.source,
          desafioPoints: getChallengeBasePoints(desafio),
          pontosPorPilar: pontuacao.pilares || [],
          livePresentationPoints: desafio.livePresentationPoints || 0,
        },
      })
    )
  );
}

async function generatePontuacoesForApprovedEnvio(envio, desafio, recipients, options = {}) {
  assertApprovedEnvio(envio);

  const envioId = getEntityId(envio);
  const desafioId = getEntityId(desafio);
  const pontosPorPilar = getChallengePillarPoints(desafio);
  const pontos = getChallengeBasePoints(desafio);
  if (!Number.isFinite(pontos) || pontos <= 0) throw createHttpError("Desafio não possui pontuação válida.", 400);
  const bonusApresentacaoAoVivo = getLivePresentationBonusPoints(desafio, options.apresentacaoAoVivo);
  const pontosTotais = pontos + bonusApresentacaoAoVivo;

  const alunos = recipients || (await getScoreRecipients(envio));
  if (!options.skipRecurrenceCheck) {
    await assertRecurringScoreLimit(envio, desafio, alunos, envio.approvedAt || envio.evaluatedAt || new Date(), {
      pontosSolicitados: pontosTotais,
    });
  }
  const existing = await Pontuacao.find({ envio: envioId, aluno: { $in: alunos } }).lean();
  const existingAlunoIds = new Set((existing || []).map((pontuacao) => getEntityId(pontuacao.aluno)));
  const pontuacoesToCreate = alunos
    .filter((alunoId) => !existingAlunoIds.has(alunoId))
    .map((alunoId) => ({
      envio: envioId,
      desafio: desafioId,
      aluno: alunoId,
      pontos: pontosTotais,
      pilares: pontosPorPilar.map((item) => ({ pilar: item.pilar, pontos: item.pontos })),
      motivo:
        bonusApresentacaoAoVivo > 0
          ? `desafio_${desafio.difficulty || "pontuacao_fixa"}_apresentacao_ao_vivo`
          : `desafio_${desafio.difficulty || "pontuacao_fixa"}`,
      source: "envio_desafio",
    }));

  if (pontuacoesToCreate.length > 0) {
    await Pontuacao.create(pontuacoesToCreate);
    await logPontuacoesGeradas(envio, desafio, pontuacoesToCreate);
  }
  return {
    pontos: pontosTotais,
    pontosPorPilar,
    ...(bonusApresentacaoAoVivo > 0 ? { pontosBase: pontos, bonusApresentacaoAoVivo } : {}),
    geradas: pontuacoesToCreate.length,
    ignoradas: alunos.length - pontuacoesToCreate.length,
    alunos,
    bonusLiderancaAplicado: shouldApplyLeadershipBonus(),
  };
}

module.exports = {
  assertNoDuplicateEvidenceScore,
  assertRecurringScoreLimit,
  generatePontuacoesForApprovedEnvio,
  getChallengeBasePoints,
  getChallengePillarPoints,
  getLivePresentationBonusPoints,
  getPeriodBounds,
  getScoreRecipients,
  normalizeEvidenceList,
  shouldApplyLeadershipBonus,
};
