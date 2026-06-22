const mongoose = require("mongoose");
require("../models/pilar.model");
const Desafio = require("../models/desafio.model");
require("../models/envio-desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");
const { inactivateExpiredChallenges } = require("./desafio-prazo.service");

const ALLOWED_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const INACTIVE_STATUS = "inativo";
const APPROVED_STATUS = "aprovado";
const EXTRA_POINTS_SOURCE = "pontuacao_extra";
const PENDING_STATUS = "pendente";
const TOP_RANKING_LIMIT = 10;
const ACTIVE_STATUS = "ativo";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getEntityId(entity) {
  if (!entity) {
    return undefined;
  }

  if (entity instanceof mongoose.Types.ObjectId) {
    return entity.toString();
  }

  if (entity.id) {
    return String(entity.id);
  }

  if (entity._id) {
    return String(entity._id);
  }

  return String(entity);
}

function omitUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

async function getAuthorizedReviewer(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_ROLES.includes(normalizeText(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode consultar o dashboard geral.", 403);
  }

  return authenticatedUser;
}

async function findUsers() {
  return User.find({}).lean();
}

async function findEnvios() {
  return EnvioDesafio.find({})
    .populate({ path: "turma", select: "name code description status" })
    .populate({
      path: "desafio",
      select: "title description points type pilar pilares",
      populate: [
        { path: "pilar", select: "name description status" },
        { path: "pilares.pilar", select: "name description status" },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();
}

async function countActiveDesafios() {
  await inactivateExpiredChallenges();
  return Desafio.countDocuments({ status: ACTIVE_STATUS });
}

async function findPontuacoes() {
  return Pontuacao.find({})
    .populate({ path: "aluno", select: "name email role status turmas" })
    .populate({ path: "envio", select: "status turma approvedAt createdAt" })
    .populate({
      path: "desafio",
      select: "title description points type pilar pilares",
      populate: [
        { path: "pilar", select: "name description status" },
        { path: "pilares.pilar", select: "name description status" },
      ],
    })
    .populate({ path: "pilares.pilar", select: "name description status" })
    .sort({ createdAt: -1 })
    .lean();
}

function isActiveStudent(user) {
  return normalizeText(user.role) === STUDENT_ROLE && normalizeText(user.status || "ativo") !== INACTIVE_STATUS;
}

function isApprovedPontuacao(pontuacao) {
  if (
    pontuacao &&
    pontuacao.aluno &&
    normalizeText(pontuacao.source) === EXTRA_POINTS_SOURCE &&
    Number.isFinite(Number(pontuacao.pontos))
  ) {
    return true;
  }

  return (
    pontuacao &&
    pontuacao.aluno &&
    pontuacao.envio &&
    pontuacao.desafio &&
    normalizeText(pontuacao.envio.status) === APPROVED_STATUS &&
    Number.isFinite(Number(pontuacao.pontos))
  );
}

function serializeAluno(aluno) {
  return omitUndefined({
    id: getEntityId(aluno),
    name: aluno.name,
    email: aluno.email,
    role: aluno.role,
    status: aluno.status,
  });
}

function serializeTurma(turma) {
  if (!turma) {
    return null;
  }

  if (typeof turma !== "object" || turma instanceof mongoose.Types.ObjectId) {
    return { id: getEntityId(turma) };
  }

  return omitUndefined({
    id: getEntityId(turma),
    name: turma.name,
    code: turma.code,
    description: turma.description,
    status: turma.status,
  });
}

function serializePilar(pilar) {
  if (!pilar) {
    return null;
  }

  if (typeof pilar !== "object" || pilar instanceof mongoose.Types.ObjectId) {
    return { id: getEntityId(pilar) };
  }

  return omitUndefined({
    id: getEntityId(pilar),
    name: pilar.name,
    description: pilar.description,
    status: pilar.status,
  });
}

function serializePilarPontuacao(item) {
  if (!item) return null;
  const pilar = item.pilar || item.pilarId || item.id;
  const pontos = Number(item.pontos || item.points || 0);
  return omitUndefined({
    pilar: serializePilar(pilar),
    pilarId: getEntityId(pilar),
    pontos,
    points: pontos,
  });
}

function getPontuacaoPilares(pontuacao) {
  const configured = Array.isArray(pontuacao && pontuacao.pilares)
    ? pontuacao.pilares.map(serializePilarPontuacao).filter((item) => item && item.pilarId)
    : [];
  if (configured.length > 0) return configured;

  const pilar = pontuacao.desafio && pontuacao.desafio.pilar;
  return pilar
    ? [{ pilar: serializePilar(pilar), pilarId: getEntityId(pilar), pontos: Number(pontuacao.pontos || 0), points: Number(pontuacao.pontos || 0) }]
    : [];
}

function buildStudentRanking(pontuacoes) {
  const groupedByAluno = new Map();

  pontuacoes.forEach((pontuacao) => {
    const alunoId = getEntityId(pontuacao.aluno);
    const current = groupedByAluno.get(alunoId) || {
      aluno: pontuacao.aluno,
      totalPontos: 0,
      envioIds: new Set(),
    };

    current.totalPontos += Number(pontuacao.pontos);
    const envioId = getEntityId(pontuacao.envio);
    if (envioId) current.envioIds.add(envioId);
    groupedByAluno.set(alunoId, current);
  });

  return Array.from(groupedByAluno.values())
    .map((item) => ({
      aluno: serializeAluno(item.aluno),
      totalPontos: item.totalPontos,
      desafiosAprovados: item.envioIds.size,
    }))
    .sort((first, second) => {
      if (second.totalPontos !== first.totalPontos) {
        return second.totalPontos - first.totalPontos;
      }

      const firstName = normalizeText(first.aluno.name);
      const secondName = normalizeText(second.aluno.name);
      const nameOrder = firstName.localeCompare(secondName, "pt-BR");

      if (nameOrder !== 0) {
        return nameOrder;
      }

      return String(first.aluno.id || "").localeCompare(String(second.aluno.id || ""));
    });
}

function assignPositions(rankingRows) {
  let previousPoints = null;
  let previousPosition = 0;

  return rankingRows.map((item, index) => {
    const posicao = item.totalPontos === previousPoints ? previousPosition : index + 1;
    previousPoints = item.totalPontos;
    previousPosition = posicao;

    return {
      posicao,
      ...item,
    };
  });
}

function buildRankingPorTurma(pontuacoes) {
  const groupedByTurma = new Map();

  pontuacoes.forEach((pontuacao) => {
    const turmas = pontuacao.envio && pontuacao.envio.turma ? [pontuacao.envio.turma] : pontuacao.aluno && Array.isArray(pontuacao.aluno.turmas) ? pontuacao.aluno.turmas : [];
    const turmasToScore = turmas.length > 0 ? turmas : [null];

    turmasToScore.forEach((turma) => {
      const turmaId = getEntityId(turma) || "sem-turma";
      const current = groupedByTurma.get(turmaId) || {
        turma: serializeTurma(turma),
        totalPontos: 0,
        alunoIds: new Set(),
        envioIds: new Set(),
      };

      current.totalPontos += Number(pontuacao.pontos);
      current.alunoIds.add(getEntityId(pontuacao.aluno));
      const envioId = getEntityId(pontuacao.envio);
      if (envioId) current.envioIds.add(envioId);
      groupedByTurma.set(turmaId, current);
    });
  });

  return Array.from(groupedByTurma.values())
    .map((item) => ({
      turma: item.turma,
      totalPontos: item.totalPontos,
      participantes: item.alunoIds.size,
      desafiosAprovados: item.envioIds.size,
    }))
    .sort((first, second) => second.totalPontos - first.totalPontos);
}

function buildRankingPorPilar(pontuacoes) {
  const groupedByPilar = new Map();

  pontuacoes.forEach((pontuacao) => {
    getPontuacaoPilares(pontuacao).forEach((item) => {
      const pilarId = item.pilarId || "sem-pilar";
      const current = groupedByPilar.get(pilarId) || {
        pilar: item.pilar,
        totalPontos: 0,
        alunoIds: new Set(),
        envioIds: new Set(),
      };

      current.totalPontos += Number(item.pontos || 0);
      current.alunoIds.add(getEntityId(pontuacao.aluno));
      const envioId = getEntityId(pontuacao.envio);
      if (envioId) current.envioIds.add(envioId);
      groupedByPilar.set(pilarId, current);
    });
  });

  return Array.from(groupedByPilar.values())
    .map((item) => ({
      pilar: item.pilar,
      totalPontos: item.totalPontos,
      participantes: item.alunoIds.size,
      desafiosAprovados: item.envioIds.size,
    }))
    .sort((first, second) => second.totalPontos - first.totalPontos);
}

function buildDesafiosPorPilar(rankingPorPilar) {
  const totalDesafios = rankingPorPilar.reduce((total, item) => total + Number(item.desafiosAprovados || 0), 0);

  return rankingPorPilar.map((item) => {
    const quantidade = Number(item.desafiosAprovados || 0);
    return {
      pilar: item.pilar,
      quantidade,
      percentual: totalDesafios > 0 ? quantidade / totalDesafios : 0,
      totalPontos: item.totalPontos,
    };
  });
}

function buildEngajamento(activeStudents, envios, approvedEnvioIds) {
  const activeStudentIds = new Set(activeStudents.map(getEntityId));
  const alunosComEnvio = new Set();

  envios.forEach((envio) => {
    const alunoId = getEntityId(envio.aluno);

    if (activeStudentIds.has(alunoId)) {
      alunosComEnvio.add(alunoId);
    }

    (envio.participantes || []).forEach((participante) => {
      const participanteId = getEntityId(participante);

      if (activeStudentIds.has(participanteId)) {
        alunosComEnvio.add(participanteId);
      }
    });
  });

  const activeStudentsCount = activeStudents.length;
  const taxaParticipacao = activeStudentsCount > 0 ? alunosComEnvio.size / activeStudentsCount : 0;
  const mediaEnviosPorAluno = activeStudentsCount > 0 ? envios.length / activeStudentsCount : 0;
  const taxaAprovacao = envios.length > 0 ? approvedEnvioIds.size / envios.length : 0;

  return {
    alunosComEnvio: alunosComEnvio.size,
    taxaParticipacao,
    mediaEnviosPorAluno,
    taxaAprovacao,
  };
}

async function getAdminDashboard(authenticatedUserId) {
  await getAuthorizedReviewer(authenticatedUserId);

  const [users, envios, pontuacoes, activeChallengesCount] = await Promise.all([findUsers(), findEnvios(), findPontuacoes(), countActiveDesafios()]);
  const activeStudents = (users || []).filter(isActiveStudent);
  const approvedPontuacoes = (pontuacoes || []).filter(isApprovedPontuacao);
  const approvedEnvioIds = new Set(approvedPontuacoes.map((pontuacao) => getEntityId(pontuacao.envio)).filter(Boolean));
  const pendingApprovals = (envios || []).filter((envio) => normalizeText(envio.status) === PENDING_STATUS);
  const ranking = assignPositions(buildStudentRanking(approvedPontuacoes));
  const rankingPorPilar = buildRankingPorPilar(approvedPontuacoes);
  const engajamento = buildEngajamento(activeStudents, envios || [], approvedEnvioIds);

  return {
    indicadores: {
      alunosAtivos: activeStudents.length,
      totalEnvios: (envios || []).length,
      quantidadeDesafios: activeChallengesCount,
      desafiosAtivos: activeChallengesCount,
      aprovacoesPendentes: pendingApprovals.length,
    },
    topRanking: ranking.slice(0, TOP_RANKING_LIMIT),
    ranking: ranking.slice(0, TOP_RANKING_LIMIT),
    rankingPorTurma: buildRankingPorTurma(approvedPontuacoes),
    rankingPorPilar,
    desafiosPorPilar: buildDesafiosPorPilar(rankingPorPilar),
    engajamento,
    metricasParticipacao: engajamento,
  };
}

module.exports = {
  getAdminDashboard,
};
