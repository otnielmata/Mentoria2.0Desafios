const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/turma.model");
const Desafio = require("../models/desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const User = require("../models/user.model");

const STUDENT_ROLE = "aluno";
const FULL_ACCESS_ROLES = ["professor", "admin"];
const GROUP_TYPE = "grupo";

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

function normalizeRole(role) {
  return typeof role === "string" ? role.trim().toLowerCase() : "";
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

function parseDateFilter(query = {}) {
  const startDateValue = getFirstValue(query, ["dataInicio", "data_inicio", "startDate", "createdFrom", "from"]);
  const endDateValue = getFirstValue(query, ["dataFim", "data_fim", "endDate", "createdTo", "to"]);
  const createdAt = {};

  if (startDateValue) {
    const startDate = new Date(startDateValue);

    if (Number.isNaN(startDate.getTime())) {
      throw createHttpError("Data inicial deve ser uma data válida.", 400);
    }

    createdAt.$gte = startDate;
  }

  if (endDateValue) {
    const endDate = new Date(endDateValue);

    if (Number.isNaN(endDate.getTime())) {
      throw createHttpError("Data final deve ser uma data válida.", 400);
    }

    if (typeof endDateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDateValue)) {
      endDate.setUTCHours(23, 59, 59, 999);
    }

    createdAt.$lte = endDate;
  }

  if (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte) {
    throw createHttpError("Data inicial não pode ser maior que a data final.", 400);
  }

  return Object.keys(createdAt).length > 0 ? createdAt : undefined;
}

async function getAuthenticatedUser(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  return authenticatedUser;
}

async function getDesafioIdsByPilar(pilarId) {
  const desafios = await Desafio.find({ pilar: pilarId }).select("_id").lean();
  return desafios.map(getEntityId);
}

async function buildProfessorFilters(query = {}) {
  const filters = {};
  const turmaId = parseObjectIdFilter(query, ["turmaId", "turma_id", "turma"], "Turma deve ser um identificador válido.");
  const desafioId = parseObjectIdFilter(
    query,
    ["desafioId", "desafio_id", "desafio"],
    "Desafio deve ser um identificador válido."
  );
  const pilarId = parseObjectIdFilter(query, ["pilarId", "pilar_id", "pilar"], "Pilar deve ser um identificador válido.");
  const createdAt = parseDateFilter(query);

  if (turmaId) {
    filters.turma = turmaId;
  }

  if (pilarId) {
    const desafioIdsByPilar = await getDesafioIdsByPilar(pilarId);
    filters.desafio = desafioId
      ? desafioIdsByPilar.includes(desafioId)
        ? desafioId
        : { $in: [] }
      : { $in: desafioIdsByPilar };
  } else if (desafioId) {
    filters.desafio = desafioId;
  }

  if (createdAt) {
    filters.createdAt = createdAt;
  }

  return filters;
}

async function buildFilters(authenticatedUser, query = {}) {
  const role = normalizeRole(authenticatedUser.role);
  const filters = {
    type: GROUP_TYPE,
    "participantes.0": { $exists: true },
  };

  if (role === STUDENT_ROLE) {
    const authenticatedUserId = getEntityId(authenticatedUser);

    return {
      ...filters,
      $or: [{ aluno: authenticatedUserId }, { participantes: authenticatedUserId }],
    };
  }

  if (FULL_ACCESS_ROLES.includes(role)) {
    return {
      ...filters,
      ...(await buildProfessorFilters(query)),
    };
  }

  throw createHttpError("Usuário não autorizado a consultar grupos de desafios.", 403);
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
    email: user.email,
    role: user.role,
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
    pilarId: getEntityId(desafio.pilar),
    title: desafio.title,
    description: desafio.description,
    points: desafio.points,
    type: desafio.type,
    max_participantes: desafio.maxParticipantes,
    status: desafio.status,
  });
}

function serializeGrupo(envio) {
  const participantes = [envio.aluno, ...(envio.participantes || [])].filter(Boolean).map(serializeUser);

  return {
    id: getEntityId(envio),
    envioId: getEntityId(envio),
    desafio: serializeDesafio(envio.desafio),
    pilar: serializePilar(envio.desafio && envio.desafio.pilar),
    turma: serializeTurma(envio.turma),
    responsavel: serializeUser(envio.aluno),
    participantes,
    totalParticipantes: participantes.length,
    status: envio.status,
    createdAt: envio.createdAt ? toDateString(envio.createdAt) : undefined,
    updatedAt: envio.updatedAt ? toDateString(envio.updatedAt) : undefined,
  };
}

async function listGrupos(authenticatedUserId, query = {}) {
  const authenticatedUser = await getAuthenticatedUser(authenticatedUserId);
  const filters = await buildFilters(authenticatedUser, query);

  const grupos = await EnvioDesafio.find(filters)
    .sort({ createdAt: -1 })
    .populate({
      path: "desafio",
      select: "title description points type maxParticipantes status pilar",
      populate: {
        path: "pilar",
        select: "name description status",
      },
    })
    .populate({ path: "turma", select: "name code description status" })
    .populate({ path: "aluno", select: "name email role" })
    .populate({ path: "participantes", select: "name email role" })
    .lean();

  return {
    grupos: grupos.map(serializeGrupo),
  };
}

module.exports = {
  listGrupos,
};
