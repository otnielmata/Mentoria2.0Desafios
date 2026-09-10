const mongoose = require("mongoose");

const DIFFICULTY_POINTS = {
  facil: 10,
  medio: 20,
  dificil: 30,
  extra: 50,
};

const MAX_PERSON_NAME_LENGTH = 120;
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 4000;
const MAX_SHORT_TEXT_LENGTH = 255;
const MAX_URL_LENGTH = 2048;
const MAX_POINTS = 1000000;
const MAX_STUDY_DURATION_MINUTES = 1440;

function createHttpError(message, statusCode = 500, options = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (options.code) error.code = options.code;
  if (options.details) error.details = options.details;
  return error;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeName(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function getEntityId(entity) {
  if (!entity) {
    return undefined;
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

  if (typeof entity.toString === "function") {
    return entity.toString();
  }

  return String(entity);
}

function hasOwn(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload || {}, field);
}

function getFirstValue(payload, fields) {
  const field = fields.find((candidate) => hasOwn(payload, candidate));
  return field ? payload[field] : undefined;
}

function assertObjectPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw createHttpError("Corpo da requisição deve ser um objeto JSON.", 400);
  }
}

function parseObjectId(value, message) {
  if (typeof value !== "string" || !mongoose.isValidObjectId(value.trim())) {
    throw createHttpError(message, 400);
  }

  return value.trim();
}

function parseOptionalObjectId(value, message) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return parseObjectId(value, message);
}

function parseRequiredText(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createHttpError(`${fieldName} é obrigatório.`, 400);
  }

  return value.trim();
}

function parseBoundedText(value, fieldName, maxLength, { required = true } = {}) {
  const text = required ? parseRequiredText(value, fieldName) : parseOptionalText(value, fieldName);
  if (text === undefined) return undefined;
  if (text.length > maxLength) {
    throw createHttpError(`${fieldName} deve ter no máximo ${maxLength} caracteres.`, 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: fieldName, message: `${fieldName} deve ter no máximo ${maxLength} caracteres.` }],
    });
  }
  return text;
}

function parsePersonName(value, fieldName = "Nome") {
  const name = parseBoundedText(value, fieldName, MAX_PERSON_NAME_LENGTH);
  if (!/^[\p{L}]+(?:[ '-][\p{L}]+)*$/u.test(name)) {
    throw createHttpError(`${fieldName} deve conter apenas letras, espaços, hífens ou apóstrofos.`, 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: fieldName, message: `${fieldName} possui caracteres inválidos.` }],
    });
  }
  return name;
}

function parseEmail(value, fieldName = "E-mail") {
  const email = parseBoundedText(value, fieldName, MAX_SHORT_TEXT_LENGTH);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createHttpError(`${fieldName} inválido.`, 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: fieldName, message: `${fieldName} inválido.` }],
    });
  }
  return email.toLowerCase();
}

function parsePassword(value, fieldName = "Senha") {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw createHttpError(`${fieldName} é obrigatória.`, 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: fieldName, message: `${fieldName} é obrigatória.` }],
    });
  }
  if (value.length < 6) {
    throw createHttpError(`${fieldName} deve ter ao menos 6 caracteres.`, 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: fieldName, message: `${fieldName} deve ter ao menos 6 caracteres.` }],
    });
  }
  return value;
}

function parseOptionalUrl(value, fieldName = "Link") {
  const url = parseBoundedText(value, fieldName, MAX_URL_LENGTH, { required: false });
  if (url === undefined) return undefined;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('protocol');
  } catch {
    throw createHttpError(`${fieldName} deve ser uma URL válida iniciando com http:// ou https://.`, 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: fieldName, message: `${fieldName} deve ser uma URL válida.` }],
    });
  }
  return url;
}

function parsePositiveInteger(value, fieldName, fallback, max = 100) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createHttpError(`${fieldName} deve ser um número inteiro maior que zero.`, 400);
  }

  return Math.min(parsed, max);
}

function parsePagination(query = {}) {
  const page = parsePositiveInteger(getFirstValue(query, ["page", "pagina"]), "page", 1, Number.MAX_SAFE_INTEGER);
  const limit = parsePositiveInteger(getFirstValue(query, ["limit", "perPage", "per_page", "tamanho"]), "limit", 20, 100);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function buildPagination(total, page, limit) {
  return {
    page,
    limit,
    total,
    totalPages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}

function parseOptionalText(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw createHttpError(`${fieldName} deve ser um texto válido.`, 400);
  }

  return value.trim();
}

function parseStudyDurationMinutes(value, fieldName = "Tempo de estudo em minutos") {
  if (value === undefined) return undefined;

  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 1 || duration > MAX_STUDY_DURATION_MINUTES) {
    throw createHttpError(`${fieldName} deve ser um número inteiro entre 1 e ${MAX_STUDY_DURATION_MINUTES}.`, 400, {
      code: "VALIDATION_ERROR",
      details: [{ field: "durationMinutes", message: `${fieldName} deve estar entre 1 e ${MAX_STUDY_DURATION_MINUTES} minutos.` }],
    });
  }

  return duration;
}

function addMinutesToDate(date, minutes) {
  if (!(date instanceof Date) || !Number.isInteger(minutes)) return date;
  return new Date(date.getTime() + minutes * 60000);
}

function getDurationMinutes(startAt, endAt) {
  if (!startAt || !endAt) return null;
  const start = startAt instanceof Date ? startAt : new Date(startAt);
  const end = endAt instanceof Date ? endAt : new Date(endAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const duration = Math.round((end.getTime() - start.getTime()) / 60000);
  return duration > 0 ? duration : null;
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

function parsePeriod(query = {}) {
  const startDate = parseDate(getFirstValue(query, ["startDate", "dataInicio", "data_inicio", "from"]), "startDate deve ser uma data válida.");
  const endDateValue = getFirstValue(query, ["endDate", "dataFim", "data_fim", "to"]);
  const endDate = parseDate(endDateValue, "endDate deve ser uma data válida.");

  if (endDate && typeof endDateValue === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDateValue)) {
    endDate.setUTCHours(23, 59, 59, 999);
  }

  if (startDate && endDate && startDate > endDate) {
    throw createHttpError("startDate não pode ser maior que endDate.", 400);
  }

  const createdAt = {};
  if (startDate) createdAt.$gte = startDate;
  if (endDate) createdAt.$lte = endDate;

  return {
    startDate,
    endDate,
    createdAt: Object.keys(createdAt).length > 0 ? createdAt : undefined,
  };
}

function parseDifficulty(value, fallback = "facil") {
  const difficulty = normalizeName(value || fallback);

  if (!Object.prototype.hasOwnProperty.call(DIFFICULTY_POINTS, difficulty)) {
    throw createHttpError("Dificuldade deve ser facil, medio, dificil ou extra.", 400);
  }

  return difficulty;
}

function pointsForDifficulty(difficulty) {
  return DIFFICULTY_POINTS[difficulty];
}

function omitUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

module.exports = {
  DIFFICULTY_POINTS,
  MAX_DESCRIPTION_LENGTH,
  MAX_PERSON_NAME_LENGTH,
  MAX_POINTS,
  MAX_SHORT_TEXT_LENGTH,
  MAX_STUDY_DURATION_MINUTES,
  MAX_TITLE_LENGTH,
  MAX_URL_LENGTH,
  assertObjectPayload,
  addMinutesToDate,
  buildPagination,
  createHttpError,
  getEntityId,
  getFirstValue,
  getDurationMinutes,
  hasOwn,
  normalizeName,
  normalizeText,
  omitUndefined,
  parseDifficulty,
  parseBoundedText,
  parseEmail,
  parseObjectId,
  parseOptionalObjectId,
  parseOptionalUrl,
  parseOptionalText,
  parsePagination,
  parsePassword,
  parsePersonName,
  parsePeriod,
  parseRequiredText,
  parseStudyDurationMinutes,
  pointsForDifficulty,
  toIsoDate,
};
