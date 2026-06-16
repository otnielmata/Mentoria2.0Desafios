const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/desafio.model");
require("../models/envio-desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");

const ALLOWED_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const INACTIVE_STATUS = "inativo";
const APPROVED_STATUS = "aprovado";
const PENDING_STATUS = "pendente";
const TOP_RANKING_LIMIT = 10;

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
      select: "title description points type pilar",
      populate: {
        path: "pilar",
        select: "name description status",
      },
    })
    .sort({ createdAt: -1 })
    .lean();
}

async function findPontuacoes() {
  return Pontuacao.find({})
    .populate({ path: "aluno", select: "name email role status" })
    .populate({ path: "envio", select: "status turma approvedAt createdAt" })
    .populate({
      path: "desafio",
      select: "title description points type pilar",
      populate: {
        path: "pilar",
        select: "name description status",
      },
    })
    .sort({ createdAt: -1 })
    .lean();
}

function isActiveStudent(user) {
  return normalizeText(user.role) === STUDENT_ROLE && normalizeText(user.status || "ativo") !== INACTIVE_STATUS;
}

function isApprovedPontuacao(pontuacao) {
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
    current.envioIds.add(getEntityId(pontuacao.envio));
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
    const turma = pontuacao.envio.turma;
    const turmaId = getEntityId(turma) || "sem-turma";
    const current = groupedByTurma.get(turmaId) || {
      turma: serializeTurma(turma),
      totalPontos: 0,
      alunoIds: new Set(),
      envioIds: new Set(),
    };

    current.totalPontos += Number(pontuacao.pontos);
    current.alunoIds.add(getEntityId(pontuacao.aluno));
    current.envioIds.add(getEntityId(pontuacao.envio));
    groupedByTurma.set(turmaId, current);
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
    const pilar = pontuacao.desafio.pilar;
    const pilarId = getEntityId(pilar) || "sem-pilar";
    const current = groupedByPilar.get(pilarId) || {
      pilar: serializePilar(pilar),
      totalPontos: 0,
      alunoIds: new Set(),
      envioIds: new Set(),
    };

    current.totalPontos += Number(pontuacao.pontos);
    current.alunoIds.add(getEntityId(pontuacao.aluno));
    current.envioIds.add(getEntityId(pontuacao.envio));
    groupedByPilar.set(pilarId, current);
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

  const [users, envios, pontuacoes] = await Promise.all([findUsers(), findEnvios(), findPontuacoes()]);
  const activeStudents = (users || []).filter(isActiveStudent);
  const approvedPontuacoes = (pontuacoes || []).filter(isApprovedPontuacao);
  const approvedEnvioIds = new Set(approvedPontuacoes.map((pontuacao) => getEntityId(pontuacao.envio)));
  const pendingApprovals = (envios || []).filter((envio) => normalizeText(envio.status) === PENDING_STATUS);
  const ranking = assignPositions(buildStudentRanking(approvedPontuacoes));
  const rankingPorPilar = buildRankingPorPilar(approvedPontuacoes);
  const engajamento = buildEngajamento(activeStudents, envios || [], approvedEnvioIds);

  return {
    indicadores: {
      alunosAtivos: activeStudents.length,
      totalEnvios: (envios || []).length,
      quantidadeDesafios: (envios || []).length,
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
