const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/desafio.model");
require("../models/envio-desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const STUDENT_ROLE = "aluno";
const APPROVED_STATUS = "aprovado";
const PENDING_STATUS = "pendente";
const LAST_SUBMISSIONS_LIMIT = 5;

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

function toDateString(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function omitUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

async function getAuthenticatedStudent(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (normalizeText(authenticatedUser.role) !== STUDENT_ROLE) {
    throw createHttpError("Apenas aluno autenticado pode consultar o dashboard.", 403);
  }

  return authenticatedUser;
}

async function findStudentTurmas(authenticatedUserId) {
  const query = Turma.find({ alunos: authenticatedUserId });
  const selectedQuery = typeof query.select === "function" ? query.select("_id") : query;
  return typeof selectedQuery.lean === "function" ? selectedQuery.lean() : selectedQuery;
}

async function buildScope(authenticatedUserId) {
  const turmas = await findStudentTurmas(authenticatedUserId);

  return {
    turmaIds: (turmas || []).map(getEntityId).filter(Boolean),
  };
}

function isEmptyScope(scope) {
  return scope.turmaIds.length === 0;
}

async function findStudentPontuacoes(authenticatedUserId, scope) {
  if (isEmptyScope(scope)) {
    return [];
  }

  return Pontuacao.find({ aluno: authenticatedUserId })
    .populate({
      path: "envio",
      select: "status turma type approvedAt createdAt",
      populate: {
        path: "turma",
        select: "name code description status",
      },
    })
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

async function findScopePontuacoes(scope) {
  if (isEmptyScope(scope)) {
    return [];
  }

  return Pontuacao.find({})
    .populate({ path: "aluno", select: "name email role status" })
    .populate({ path: "envio", select: "status turma approvedAt createdAt" })
    .sort({ createdAt: -1 })
    .lean();
}

async function findStudentEnvios(authenticatedUserId, scope) {
  if (isEmptyScope(scope)) {
    return [];
  }

  return EnvioDesafio.find({
    turma: { $in: scope.turmaIds },
    $or: [{ aluno: authenticatedUserId }, { participantes: authenticatedUserId }],
  })
    .populate({
      path: "desafio",
      select: "title description points type pilar",
      populate: {
        path: "pilar",
        select: "name description status",
      },
    })
    .populate({ path: "turma", select: "name code description status" })
    .sort({ createdAt: -1 })
    .lean();
}

function isApprovedPontuacao(pontuacao) {
  return (
    pontuacao &&
    pontuacao.envio &&
    pontuacao.desafio &&
    normalizeText(pontuacao.envio.status) === APPROVED_STATUS &&
    Number.isFinite(Number(pontuacao.pontos))
  );
}

function matchesScopeByEnvio(pontuacao, scope) {
  return scope.turmaIds.includes(getEntityId(pontuacao.envio.turma));
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

function serializeDesafio(desafio) {
  if (!desafio) {
    return null;
  }

  if (typeof desafio !== "object" || desafio instanceof mongoose.Types.ObjectId) {
    return { id: getEntityId(desafio) };
  }

  return omitUndefined({
    id: getEntityId(desafio),
    title: desafio.title,
    description: desafio.description,
    points: desafio.points,
    type: desafio.type,
    pilar: serializePilar(desafio.pilar),
  });
}

function serializeEnvio(envio) {
  return omitUndefined({
    id: getEntityId(envio),
    desafio: serializeDesafio(envio.desafio),
    pilar: serializePilar(envio.desafio && envio.desafio.pilar),
    turma: serializeTurma(envio.turma),
    status: envio.status,
    type: envio.type,
    description: envio.description,
    evidencias: envio.evidencias,
    createdAt: envio.createdAt ? toDateString(envio.createdAt) : undefined,
    updatedAt: envio.updatedAt ? toDateString(envio.updatedAt) : undefined,
    approvedAt: envio.approvedAt ? toDateString(envio.approvedAt) : undefined,
  });
}

function buildPontosPorPilar(pontuacoes) {
  const groupedByPilar = new Map();

  pontuacoes.forEach((pontuacao) => {
    const pilar = pontuacao.desafio.pilar;
    const pilarId = getEntityId(pilar) || "sem-pilar";
    const current = groupedByPilar.get(pilarId) || {
      pilar: serializePilar(pilar),
      pontos: 0,
      envioIds: new Set(),
    };

    current.pontos += Number(pontuacao.pontos);
    current.envioIds.add(getEntityId(pontuacao.envio));
    groupedByPilar.set(pilarId, current);
  });

  return Array.from(groupedByPilar.values()).map((item) => ({
    pilar: item.pilar,
    pontos: item.pontos,
    desafiosAprovados: item.envioIds.size,
  }));
}

function buildRankingRows(pontuacoes) {
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

  return Array.from(groupedByAluno.values()).map((item) => ({
    alunoId: getEntityId(item.aluno),
    totalPontos: item.totalPontos,
    desafiosAprovados: item.envioIds.size,
  }));
}

function sortRankingRows(rows) {
  return rows.sort((first, second) => {
    if (second.totalPontos !== first.totalPontos) {
      return second.totalPontos - first.totalPontos;
    }

    return String(first.alunoId || "").localeCompare(String(second.alunoId || ""));
  });
}

function assignPositions(rows) {
  let previousPoints = null;
  let previousPosition = 0;

  return rows.map((row, index) => {
    const position = row.totalPontos === previousPoints ? previousPosition : index + 1;
    previousPoints = row.totalPontos;
    previousPosition = position;

    return {
      posicao: position,
      ...row,
    };
  });
}

function getStudentRankingPosition(authenticatedUserId, scopePontuacoes) {
  const ranking = assignPositions(sortRankingRows(buildRankingRows(scopePontuacoes)));
  const studentRanking = ranking.find((item) => item.alunoId === authenticatedUserId);

  return {
    posicao: studentRanking ? studentRanking.posicao : null,
    totalParticipantes: ranking.length,
    criterioDesempate: "posicao_compartilhada_id",
  };
}

function emptyDashboard(scope) {
  return {
    totalPontos: 0,
    posicaoRanking: null,
    totalParticipantesRanking: 0,
    desafiosAprovados: 0,
    pendencias: 0,
    pontosPorPilar: [],
    ultimosEnvios: [],
    escopo: {
      turmaIds: scope.turmaIds,
    },
  };
}

async function getMyDashboard(authenticatedUserId) {
  await getAuthenticatedStudent(authenticatedUserId);

  const scope = await buildScope(authenticatedUserId);

  if (isEmptyScope(scope)) {
    return emptyDashboard(scope);
  }

  const [studentPontuacoes, scopePontuacoes, studentEnvios] = await Promise.all([
    findStudentPontuacoes(authenticatedUserId, scope),
    findScopePontuacoes(scope),
    findStudentEnvios(authenticatedUserId, scope),
  ]);
  const validStudentPontuacoes = (studentPontuacoes || [])
    .filter(isApprovedPontuacao)
    .filter((pontuacao) => matchesScopeByEnvio(pontuacao, scope));
  const validScopePontuacoes = (scopePontuacoes || [])
    .filter(isApprovedPontuacao)
    .filter((pontuacao) => matchesScopeByEnvio(pontuacao, scope));
  const approvedEnvioIds = new Set(validStudentPontuacoes.map((pontuacao) => getEntityId(pontuacao.envio)));
  const ranking = getStudentRankingPosition(authenticatedUserId, validScopePontuacoes);

  return {
    totalPontos: validStudentPontuacoes.reduce((total, pontuacao) => total + Number(pontuacao.pontos), 0),
    posicaoRanking: ranking.posicao,
    totalParticipantesRanking: ranking.totalParticipantes,
    desafiosAprovados: approvedEnvioIds.size,
    pendencias: (studentEnvios || []).filter((envio) => normalizeText(envio.status) === PENDING_STATUS).length,
    pontosPorPilar: buildPontosPorPilar(validStudentPontuacoes),
    ultimosEnvios: (studentEnvios || []).slice(0, LAST_SUBMISSIONS_LIMIT).map(serializeEnvio),
    escopo: {
      turmaIds: scope.turmaIds,
    },
  };
}

module.exports = {
  getMyDashboard,
};
