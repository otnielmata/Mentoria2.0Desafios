const mongoose = require("mongoose");
require("../models/desafio.model");
require("../models/pilar.model");
require("../models/turma.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");

const APPROVED_STATUS = "aprovado";
const GROUP_TYPE = "grupo";
const STUDENT_ROLE = "aluno";

function createHttpError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getEntityId(entity) {
  if (!entity) {
    return "";
  }

  if (typeof entity === "string") {
    return entity;
  }

  if (entity instanceof mongoose.Types.ObjectId) {
    return entity.toString();
  }

  if (entity.id) {
    return String(entity.id);
  }

  if (entity._id) {
    return getEntityId(entity._id);
  }

  return String(entity);
}

function normalizeText(value = "") {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function omitUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  if (typeof user !== "object" || user instanceof mongoose.Types.ObjectId) {
    return { id: getEntityId(user) };
  }

  return omitUndefined({
    id: getEntityId(user),
    name: user.name,
    role: user.role,
    status: user.status,
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
    description: pilar.description,
    id: getEntityId(pilar),
    name: pilar.name,
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
    code: turma.code,
    description: turma.description,
    id: getEntityId(turma),
    name: turma.name,
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
    description: desafio.description,
    id: getEntityId(desafio),
    maxParticipantes: desafio.maxParticipantes,
    pilar: serializePilar(desafio.pilar),
    pilarId: getEntityId(desafio.pilar),
    points: desafio.points,
    status: desafio.status,
    title: desafio.title,
    type: desafio.type,
  });
}

function getParticipantList(envio) {
  return [envio.aluno, ...(envio.participantes || [])]
    .filter(Boolean)
    .slice(0, 5)
    .map(serializeUser);
}

function buildMyGroupsFilter(authenticatedUserId) {
  return {
    $or: [{ aluno: authenticatedUserId }, { participantes: authenticatedUserId }],
    "participantes.0": { $exists: true },
    type: GROUP_TYPE,
  };
}

function buildScoreMap(scores = []) {
  return new Map(scores.map((score) => [getEntityId(score.envio), score]));
}

function serializeStudentGroup(envio, scoreMap = new Map()) {
  const status = normalizeText(envio.status || "pendente");
  const isApproved = status === APPROVED_STATUS;
  const score = scoreMap.get(getEntityId(envio));
  const challengePoints = Number(envio.desafio?.points || 0);
  const grantedPoints = isApproved ? Number(score?.pontos ?? challengePoints) : 0;
  const pilar = serializePilar(envio.desafio?.pilar);

  return {
    createdAt: toIsoDate(envio.createdAt),
    desafio: serializeDesafio(envio.desafio),
    desafioTitulo: envio.desafio?.title || "Envio de desafio",
    envioId: getEntityId(envio),
    id: getEntityId(envio),
    participantes: getParticipantList(envio),
    pilar,
    pilarNome: pilar?.name,
    pontos: grantedPoints,
    pontosConcedidos: isApproved ? grantedPoints : null,
    pontuacaoConsideradaNoRanking: isApproved,
    responsavel: serializeUser(envio.aluno),
    responsavelNome: envio.aluno?.name,
    status,
    totalParticipantes: [envio.aluno, ...(envio.participantes || [])].filter(Boolean).length,
    turma: serializeTurma(envio.turma),
    updatedAt: toIsoDate(envio.updatedAt),
  };
}

async function getAuthenticatedStudent(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);

  if (!user) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (normalizeText(user.role) !== STUDENT_ROLE) {
    throw createHttpError("Apenas alunos podem consultar seus grupos de desafios.", 403);
  }

  return user;
}

async function listMyGroups(authenticatedUserId) {
  const student = await getAuthenticatedStudent(authenticatedUserId);
  const studentId = getEntityId(student);
  const groups = await EnvioDesafio.find(buildMyGroupsFilter(studentId))
    .sort({ createdAt: -1 })
    .populate({
      path: "desafio",
      populate: {
        path: "pilar",
        select: "name description status",
      },
      select: "title description points type maxParticipantes status pilar",
    })
    .populate({ path: "turma", select: "name code description status" })
    .populate({ path: "aluno", select: "name role status" })
    .populate({ path: "participantes", select: "name role status" })
    .lean();

  const scores = await Pontuacao.find({
    aluno: studentId,
    envio: { $in: groups.map(getEntityId) },
  }).lean();

  const scoreMap = buildScoreMap(scores);

  return {
    grupos: groups.map((group) => serializeStudentGroup(group, scoreMap)),
  };
}

module.exports = {
  buildMyGroupsFilter,
  buildScoreMap,
  getEntityId,
  listMyGroups,
  serializeStudentGroup,
};
