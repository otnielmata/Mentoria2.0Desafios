const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/turma.model");
require("../models/desafio.model");
require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");

const STUDENT_ROLE = "aluno";
const APPROVED_STATUS = "aprovado";

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function hasOwn(query, field) {
  return Object.prototype.hasOwnProperty.call(query, field);
}

function getFirstValue(query, fields) {
  const field = fields.find((candidate) => hasOwn(query, candidate));
  return field ? query[field] : undefined;
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

function parseObjectIdFilter(query, fields, message) {
  const value = getFirstValue(query, fields);

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string" || !mongoose.isValidObjectId(value.trim())) {
    throw createHttpError(message, 400);
  }

  return value.trim();
}

function parseDate(value, message) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(message, 400);
  }

  return date;
}

function parsePeriodoFilter(query = {}) {
  const startDateValue = getFirstValue(query, ["dataInicio", "data_inicio", "startDate", "createdFrom", "from"]);
  const endDateValue = getFirstValue(query, ["dataFim", "data_fim", "endDate", "createdTo", "to"]);
  const dataInicio = parseDate(startDateValue, "Data inicial deve ser uma data válida.");
  const dataFim = parseDate(endDateValue, "Data final deve ser uma data válida.");

  if (dataFim && typeof endDateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDateValue)) {
    dataFim.setUTCHours(23, 59, 59, 999);
  }

  if (dataInicio && dataFim && dataInicio > dataFim) {
    throw createHttpError("Data inicial não pode ser maior que a data final.", 400);
  }

  const createdAt = {};

  if (dataInicio) {
    createdAt.$gte = dataInicio;
  }

  if (dataFim) {
    createdAt.$lte = dataFim;
  }

  return {
    dataInicio,
    dataFim,
    createdAt: Object.keys(createdAt).length > 0 ? createdAt : undefined,
  };
}

function parseFilters(query = {}) {
  const turmaId = parseObjectIdFilter(query, ["turmaId", "turma_id", "turma"], "Turma deve ser um identificador válido.");
  const pilarId = parseObjectIdFilter(query, ["pilarId", "pilar_id", "pilar"], "Pilar deve ser um identificador válido.");
  const periodo = parsePeriodoFilter(query);

  return {
    turmaId,
    pilarId,
    dataInicio: periodo.dataInicio,
    dataFim: periodo.dataFim,
    createdAt: periodo.createdAt,
  };
}

async function getAuthenticatedStudent(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (normalizeText(authenticatedUser.role) !== STUDENT_ROLE) {
    throw createHttpError("Apenas aluno autenticado pode consultar pontuações.", 403);
  }

  return authenticatedUser;
}

function buildPontuacaoFilters(alunoId, filters) {
  return omitUndefined({
    aluno: alunoId,
    createdAt: filters.createdAt,
  });
}

async function findPontuacoes(alunoId, filters) {
  return Pontuacao.find(buildPontuacaoFilters(alunoId, filters))
    .populate({
      path: "envio",
      select: "status turma approvedAt createdAt",
      populate: {
        path: "turma",
        select: "name code description status",
      },
    })
    .populate({
      path: "desafio",
      select: "title description points pilar",
      populate: {
        path: "pilar",
        select: "name description status",
      },
    })
    .sort({ createdAt: -1 })
    .lean();
}

function getPontuacaoCreatedAt(pontuacao) {
  if (!pontuacao.createdAt) {
    return undefined;
  }

  const date = pontuacao.createdAt instanceof Date ? pontuacao.createdAt : new Date(pontuacao.createdAt);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isValidApprovedPontuacao(pontuacao) {
  return (
    pontuacao &&
    pontuacao.envio &&
    normalizeText(pontuacao.envio.status) === APPROVED_STATUS &&
    pontuacao.desafio &&
    Number.isFinite(Number(pontuacao.pontos))
  );
}

function matchesFilters(pontuacao, filters) {
  if (filters.turmaId && getEntityId(pontuacao.envio.turma) !== filters.turmaId) {
    return false;
  }

  if (filters.pilarId && getEntityId(pontuacao.desafio.pilar) !== filters.pilarId) {
    return false;
  }

  const createdAt = getPontuacaoCreatedAt(pontuacao);

  if (filters.dataInicio && (!createdAt || createdAt < filters.dataInicio)) {
    return false;
  }

  if (filters.dataFim && (!createdAt || createdAt > filters.dataFim)) {
    return false;
  }

  return true;
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
    pilar: serializePilar(desafio.pilar),
  });
}

function serializeHistoricoItem(pontuacao) {
  return {
    id: getEntityId(pontuacao),
    envioId: getEntityId(pontuacao.envio),
    desafio: serializeDesafio(pontuacao.desafio),
    pilar: serializePilar(pontuacao.desafio.pilar),
    turma: serializeTurma(pontuacao.envio.turma),
    pontos: Number(pontuacao.pontos),
    createdAt: pontuacao.createdAt ? toDateString(pontuacao.createdAt) : undefined,
    approvedAt: pontuacao.envio.approvedAt ? toDateString(pontuacao.envio.approvedAt) : undefined,
  };
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

function serializeFilters(filters) {
  return omitUndefined({
    turmaId: filters.turmaId,
    pilarId: filters.pilarId,
    dataInicio: filters.dataInicio ? filters.dataInicio.toISOString() : undefined,
    dataFim: filters.dataFim ? filters.dataFim.toISOString() : undefined,
  });
}

async function getMyPontuacoes(authenticatedUserId, query = {}) {
  await getAuthenticatedStudent(authenticatedUserId);

  const filters = parseFilters(query);
  const pontuacoes = await findPontuacoes(authenticatedUserId, filters);
  const validPontuacoes = (pontuacoes || [])
    .filter(isValidApprovedPontuacao)
    .filter((pontuacao) => matchesFilters(pontuacao, filters));
  const approvedEnvioIds = new Set(validPontuacoes.map((pontuacao) => getEntityId(pontuacao.envio)));

  return {
    totalPontos: validPontuacoes.reduce((total, pontuacao) => total + Number(pontuacao.pontos), 0),
    desafiosAprovados: approvedEnvioIds.size,
    pontosPorPilar: buildPontosPorPilar(validPontuacoes),
    historico: validPontuacoes.map(serializeHistoricoItem),
    filtros: serializeFilters(filters),
  };
}

module.exports = {
  getMyPontuacoes,
};
