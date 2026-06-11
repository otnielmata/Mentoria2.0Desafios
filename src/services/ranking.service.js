const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/desafio.model");
require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const APPROVED_STATUS = "aprovado";
const STUDENT_ROLE = "aluno";
const GLOBAL_ROLES = ["professor", "admin"];
const ALLOWED_TYPES = ["individual", "grupo"];

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

function parseDateFilters(query = {}) {
  const startDateValue = getFirstValue(query, ["startDate", "dataInicio", "data_inicio", "from"]);
  const endDateValue = getFirstValue(query, ["endDate", "dataFim", "data_fim", "to"]);
  const startDate = parseDate(startDateValue, "startDate deve ser uma data válida.");
  const endDate = parseDate(endDateValue, "endDate deve ser uma data válida.");

  if (endDate && typeof endDateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDateValue)) {
    endDate.setUTCHours(23, 59, 59, 999);
  }

  if (startDate && endDate && startDate > endDate) {
    throw createHttpError("startDate não pode ser maior que endDate.", 400);
  }

  const createdAt = {};

  if (startDate) {
    createdAt.$gte = startDate;
  }

  if (endDate) {
    createdAt.$lte = endDate;
  }

  return {
    startDate,
    endDate,
    createdAt: Object.keys(createdAt).length > 0 ? createdAt : undefined,
  };
}

function parseType(query = {}) {
  const type = normalizeText(getFirstValue(query, ["type", "tipo"]));

  if (!type) {
    return undefined;
  }

  if (!ALLOWED_TYPES.includes(type)) {
    throw createHttpError("Tipo deve ser individual ou grupo.", 400);
  }

  return type;
}

function parseFilters(query = {}) {
  const turmaId = parseObjectIdFilter(query, ["turmaId", "turma_id", "turma"], "Turma deve ser um identificador válido.");
  const pilarId = parseObjectIdFilter(query, ["pilarId", "pilar_id", "pilar"], "Pilar deve ser um identificador válido.");
  const dateFilters = parseDateFilters(query);

  return {
    turmaId,
    pilarId,
    type: parseType(query),
    startDate: dateFilters.startDate,
    endDate: dateFilters.endDate,
    createdAt: dateFilters.createdAt,
  };
}

async function getAuthenticatedUser(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  return authenticatedUser;
}

async function findStudentTurmas(authenticatedUserId) {
  const query = Turma.find({ alunos: authenticatedUserId });
  const selectedQuery = typeof query.select === "function" ? query.select("_id") : query;
  return typeof selectedQuery.lean === "function" ? selectedQuery.lean() : selectedQuery;
}

async function buildScope(authenticatedUser, filters) {
  const role = normalizeText(authenticatedUser.role || STUDENT_ROLE);

  if (GLOBAL_ROLES.includes(role)) {
    return {
      role,
      allowedTurmaIds: filters.turmaId ? [filters.turmaId] : null,
      requestedTurmaAllowed: true,
    };
  }

  const turmas = await findStudentTurmas(getEntityId(authenticatedUser));
  const studentTurmaIds = (turmas || []).map(getEntityId).filter(Boolean);
  const allowedTurmaIds = filters.turmaId ? studentTurmaIds.filter((turmaId) => turmaId === filters.turmaId) : studentTurmaIds;

  return {
    role,
    allowedTurmaIds,
    requestedTurmaAllowed: !filters.turmaId || allowedTurmaIds.includes(filters.turmaId),
  };
}

function buildPontuacaoFilters(filters) {
  return omitUndefined({
    createdAt: filters.createdAt,
  });
}

async function findPontuacoes(filters) {
  return Pontuacao.find(buildPontuacaoFilters(filters))
    .populate({ path: "aluno", select: "name email role status" })
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
    pontuacao.aluno &&
    pontuacao.envio &&
    pontuacao.desafio &&
    normalizeText(pontuacao.envio.status) === APPROVED_STATUS &&
    Number.isFinite(Number(pontuacao.pontos))
  );
}

function matchesScope(pontuacao, scope) {
  if (scope.allowedTurmaIds === null) {
    return true;
  }

  return scope.allowedTurmaIds.includes(getEntityId(pontuacao.envio.turma));
}

function matchesFilters(pontuacao, filters) {
  if (filters.turmaId && getEntityId(pontuacao.envio.turma) !== filters.turmaId) {
    return false;
  }

  if (filters.pilarId && getEntityId(pontuacao.desafio.pilar) !== filters.pilarId) {
    return false;
  }

  if (filters.type && normalizeText(pontuacao.envio.type) !== filters.type) {
    return false;
  }

  const createdAt = getPontuacaoCreatedAt(pontuacao);

  if (filters.startDate && (!createdAt || createdAt < filters.startDate)) {
    return false;
  }

  if (filters.endDate && (!createdAt || createdAt > filters.endDate)) {
    return false;
  }

  return true;
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
    aluno: serializeAluno(item.aluno),
    totalPontos: item.totalPontos,
    desafiosAprovados: item.envioIds.size,
  }));
}

function sortRankingRows(rows) {
  return rows.sort((first, second) => {
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

function serializeFilters(filters) {
  return omitUndefined({
    turmaId: filters.turmaId,
    pilarId: filters.pilarId,
    type: filters.type,
    startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
    endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
  });
}

function serializeScope(scope) {
  return {
    role: scope.role,
    turmaIds: scope.allowedTurmaIds === null ? null : scope.allowedTurmaIds,
    requestedTurmaAllowed: scope.requestedTurmaAllowed,
  };
}

async function getFilteredRanking(authenticatedUserId, query = {}) {
  const authenticatedUser = await getAuthenticatedUser(authenticatedUserId);
  const filters = parseFilters(query);
  const scope = await buildScope(authenticatedUser, filters);

  if (!scope.requestedTurmaAllowed) {
    return {
      totalParticipantes: 0,
      criterioDesempate: "posicao_compartilhada_nome_id",
      filtros: serializeFilters(filters),
      escopo: serializeScope(scope),
      ranking: [],
    };
  }

  const pontuacoes = await findPontuacoes(filters);
  const filteredPontuacoes = (pontuacoes || [])
    .filter(isValidApprovedPontuacao)
    .filter((pontuacao) => matchesScope(pontuacao, scope))
    .filter((pontuacao) => matchesFilters(pontuacao, filters));
  const ranking = assignPositions(sortRankingRows(buildRankingRows(filteredPontuacoes)));

  return {
    totalParticipantes: ranking.length,
    criterioDesempate: "posicao_compartilhada_nome_id",
    filtros: serializeFilters(filters),
    escopo: serializeScope(scope),
    ranking,
  };
}

module.exports = {
  getFilteredRanking,
};
