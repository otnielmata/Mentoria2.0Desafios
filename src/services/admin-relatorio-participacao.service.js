const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/turma.model");
require("../models/desafio.model");
require("../models/envio-desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");

const ALLOWED_ROLES = ["professor", "admin"];
const APPROVED_STATUS = "aprovado";
const REJECTED_STATUS = "reprovado";
const PENDING_STATUS = "pendente";

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

function parsePeriodFilters(query = {}) {
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

function parseFilters(query = {}) {
  const period = parsePeriodFilters(query);

  return {
    turmaId: parseObjectIdFilter(query, ["turmaId", "turma_id", "turma"], "Turma deve ser um identificador válido."),
    pilarId: parseObjectIdFilter(query, ["pilarId", "pilar_id", "pilar"], "Pilar deve ser um identificador válido."),
    startDate: period.startDate,
    endDate: period.endDate,
    createdAt: period.createdAt,
  };
}

async function getAuthorizedReviewer(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_ROLES.includes(normalizeText(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode consultar relatório de participação.", 403);
  }

  return authenticatedUser;
}

function buildEnvioQuery(filters) {
  return omitUndefined({
    turma: filters.turmaId,
    createdAt: filters.createdAt,
  });
}

async function findEnvios(filters) {
  return EnvioDesafio.find(buildEnvioQuery(filters))
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
    .populate({
      path: "envio",
      select: "status turma createdAt approvedAt",
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

function getCreatedAt(entity) {
  if (!entity || !entity.createdAt) {
    return undefined;
  }

  const date = entity.createdAt instanceof Date ? entity.createdAt : new Date(entity.createdAt);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function matchesDate(entity, filters) {
  const createdAt = getCreatedAt(entity);

  if (filters.startDate && (!createdAt || createdAt < filters.startDate)) {
    return false;
  }

  if (filters.endDate && (!createdAt || createdAt > filters.endDate)) {
    return false;
  }

  return true;
}

function matchesPilar(entity, filters) {
  if (!filters.pilarId) {
    return true;
  }

  return getEntityId(entity.desafio && entity.desafio.pilar) === filters.pilarId;
}

function matchesTurmaByEnvio(entity, filters) {
  if (!filters.turmaId) {
    return true;
  }

  return getEntityId(entity.turma) === filters.turmaId;
}

function matchesPontuacaoFilters(pontuacao, filters) {
  return (
    pontuacao &&
    pontuacao.envio &&
    pontuacao.desafio &&
    normalizeText(pontuacao.envio.status) === APPROVED_STATUS &&
    Number.isFinite(Number(pontuacao.pontos)) &&
    matchesDate(pontuacao.envio, filters) &&
    matchesPilar(pontuacao, filters) &&
    (!filters.turmaId || getEntityId(pontuacao.envio.turma) === filters.turmaId)
  );
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

function buildStatusTotals(envios) {
  const totals = {
    aprovado: 0,
    reprovado: 0,
    pendente: 0,
    ajuste: 0,
    cancelado: 0,
    outros: 0,
  };

  envios.forEach((envio) => {
    const status = normalizeText(envio.status);

    if (Object.prototype.hasOwnProperty.call(totals, status)) {
      totals[status] += 1;
    } else {
      totals.outros += 1;
    }
  });

  return totals;
}

function getPointRange(points) {
  if (points <= 0) {
    return { key: "zero", label: "0 pontos" };
  }

  if (points <= 50) {
    return { key: "ate50", label: "1 a 50 pontos" };
  }

  if (points <= 100) {
    return { key: "de51a100", label: "51 a 100 pontos" };
  }

  return { key: "acima100", label: "Acima de 100 pontos" };
}

function buildPointRanges(pontuacoes) {
  const ranges = new Map();

  pontuacoes.forEach((pontuacao) => {
    const range = getPointRange(Number(pontuacao.pontos));
    const current = ranges.get(range.key) || {
      faixa: range.key,
      label: range.label,
      quantidade: 0,
      totalPontos: 0,
    };

    current.quantidade += 1;
    current.totalPontos += Number(pontuacao.pontos);
    ranges.set(range.key, current);
  });

  return Array.from(ranges.values());
}

function buildPointsByPilar(pontuacoes) {
  const groupedByPilar = new Map();

  pontuacoes.forEach((pontuacao) => {
    const pilar = pontuacao.desafio.pilar;
    const pilarId = getEntityId(pilar) || "sem-pilar";
    const current = groupedByPilar.get(pilarId) || {
      pilar: serializePilar(pilar),
      quantidade: 0,
      totalPontos: 0,
    };

    current.quantidade += 1;
    current.totalPontos += Number(pontuacao.pontos);
    groupedByPilar.set(pilarId, current);
  });

  return Array.from(groupedByPilar.values()).sort((first, second) => second.totalPontos - first.totalPontos);
}

function buildPointDistribution(pontuacoes) {
  const totalPontos = pontuacoes.reduce((total, pontuacao) => total + Number(pontuacao.pontos), 0);
  const quantidadePontuacoes = pontuacoes.length;

  return {
    totalPontos,
    quantidadePontuacoes,
    mediaPontos: quantidadePontuacoes > 0 ? totalPontos / quantidadePontuacoes : 0,
    faixas: buildPointRanges(pontuacoes),
    porPilar: buildPointsByPilar(pontuacoes),
  };
}

function serializeFilters(filters) {
  return omitUndefined({
    turmaId: filters.turmaId,
    pilarId: filters.pilarId,
    startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
    endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
  });
}

async function getParticipationReport(authenticatedUserId, query = {}) {
  await getAuthorizedReviewer(authenticatedUserId);

  const filters = parseFilters(query);
  const [envios, pontuacoes] = await Promise.all([findEnvios(filters), findPontuacoes()]);
  const filteredEnvios = (envios || []).filter(
    (envio) => matchesDate(envio, filters) && matchesPilar(envio, filters) && matchesTurmaByEnvio(envio, filters)
  );
  const statusTotals = buildStatusTotals(filteredEnvios);
  const filteredPontuacoes = (pontuacoes || []).filter((pontuacao) => matchesPontuacaoFilters(pontuacao, filters));

  return {
    filtros: serializeFilters(filters),
    quantidadeEnvios: filteredEnvios.length,
    totaisPorStatus: statusTotals,
    resumo: {
      aprovados: statusTotals[APPROVED_STATUS],
      reprovados: statusTotals[REJECTED_STATUS],
      pendentes: statusTotals[PENDING_STATUS],
    },
    distribuicaoPontos: buildPointDistribution(filteredPontuacoes),
  };
}

module.exports = {
  getParticipationReport,
};
