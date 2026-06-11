const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/desafio.model");
require("../models/turma.model");
require("../models/envio-desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");

const ALLOWED_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";

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

function parseNumberFilter(query, fields, message, { integer = false } = {}) {
  const value = getFirstValue(query, fields);

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
    throw createHttpError(message, 400);
  }

  return number;
}

function parseFilters(query = {}) {
  const period = parsePeriodFilters(query);
  const diasSemEnvioLimite = parseNumberFilter(
    query,
    ["diasSemEnvio", "maxDiasSemEnvio", "limiteDiasSemEnvio", "daysWithoutSubmissionLimit"],
    "diasSemEnvio deve ser um número inteiro maior ou igual a zero.",
    { integer: true }
  );
  const pontuacaoMinima = parseNumberFilter(
    query,
    ["pontuacaoMinima", "minPontuacao", "minPoints", "pontosMinimos"],
    "pontuacaoMinima deve ser um número maior ou igual a zero."
  );

  if (diasSemEnvioLimite === undefined && pontuacaoMinima === undefined) {
    throw createHttpError("Informe diasSemEnvio ou pontuacaoMinima para definir baixa participação.", 400);
  }

  return {
    turmaId: parseObjectIdFilter(query, ["turmaId", "turma_id", "turma"], "Turma deve ser um identificador válido."),
    startDate: period.startDate,
    endDate: period.endDate,
    createdAt: period.createdAt,
    diasSemEnvioLimite,
    pontuacaoMinima,
  };
}

async function assertCanAccessReport(authenticatedUserId) {
  const authenticatedUser = await User.findById(authenticatedUserId);

  if (!authenticatedUser) {
    throw createHttpError("Usuário autenticado não encontrado.", 404);
  }

  if (!ALLOWED_ROLES.includes(normalizeText(authenticatedUser.role))) {
    throw createHttpError("Apenas professor ou admin pode consultar relatório de baixa participação.", 403);
  }
}

async function findTurma(turmaId) {
  if (!turmaId) {
    return null;
  }

  const turma = await Turma.findById(turmaId).select("name code description alunos status").lean();

  if (!turma) {
    throw createHttpError("Turma não encontrada.", 404);
  }

  return turma;
}

function buildStudentQuery(filters, turma) {
  const query = {
    role: STUDENT_ROLE,
    status: ACTIVE_STATUS,
  };

  if (filters.turmaId) {
    const turmaStudentIds = Array.isArray(turma && turma.alunos)
      ? turma.alunos.map((aluno) => getEntityId(aluno)).filter(Boolean)
      : [];

    query.$or = [{ _id: { $in: turmaStudentIds } }, { turmas: filters.turmaId }];
  }

  return query;
}

async function findStudents(filters, turma) {
  return User.find(buildStudentQuery(filters, turma)).select("name email role status turmas").lean();
}

function buildEnvioQuery(filters, studentIds) {
  return omitUndefined({
    $or: [{ aluno: { $in: studentIds } }, { participantes: { $in: studentIds } }],
    turma: filters.turmaId,
    createdAt: filters.createdAt,
  });
}

async function findEnvios(filters, studentIds) {
  return EnvioDesafio.find(buildEnvioQuery(filters, studentIds)).sort({ createdAt: -1 }).lean();
}

function buildPontuacaoQuery(filters, studentIds) {
  return omitUndefined({
    aluno: { $in: studentIds },
    createdAt: filters.createdAt,
  });
}

async function findPontuacoes(filters, studentIds) {
  return Pontuacao.find(buildPontuacaoQuery(filters, studentIds))
    .populate({ path: "envio", select: "turma createdAt status" })
    .sort({ createdAt: -1 })
    .lean();
}

function getDate(entity, field = "createdAt") {
  if (!entity || !entity[field]) {
    return undefined;
  }

  const date = entity[field] instanceof Date ? entity[field] : new Date(entity[field]);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toIsoDate(date) {
  return date ? date.toISOString() : null;
}

function getStudentIdsFromEnvio(envio) {
  const studentIds = new Set();
  const ownerId = getEntityId(envio && envio.aluno);

  if (ownerId) {
    studentIds.add(ownerId);
  }

  if (Array.isArray(envio && envio.participantes)) {
    envio.participantes.forEach((participante) => {
      const participanteId = getEntityId(participante);
      if (participanteId) {
        studentIds.add(participanteId);
      }
    });
  }

  return Array.from(studentIds);
}

function createStudentParticipation(student) {
  return {
    student,
    pontuacaoAtual: 0,
    ultimoEnvio: null,
    ultimaAtividade: null,
  };
}

function isNewerActivity(currentActivity, candidateDate) {
  return candidateDate && (!currentActivity || candidateDate > currentActivity.date);
}

function setLastSubmission(participation, envio) {
  const createdAt = getDate(envio);

  if (isNewerActivity(participation.ultimoEnvio, createdAt)) {
    participation.ultimoEnvio = {
      id: getEntityId(envio),
      status: envio.status,
      date: createdAt,
    };
  }

  if (isNewerActivity(participation.ultimaAtividade, createdAt)) {
    participation.ultimaAtividade = {
      tipo: "envio",
      id: getEntityId(envio),
      date: createdAt,
    };
  }
}

function setLastScoreActivity(participation, pontuacao) {
  const createdAt = getDate(pontuacao);

  if (isNewerActivity(participation.ultimaAtividade, createdAt)) {
    participation.ultimaAtividade = {
      tipo: "pontuacao",
      id: getEntityId(pontuacao),
      date: createdAt,
    };
  }
}

function matchesPontuacaoTurma(pontuacao, filters) {
  if (!filters.turmaId) {
    return true;
  }

  return getEntityId(pontuacao && pontuacao.envio && pontuacao.envio.turma) === filters.turmaId;
}

function buildParticipationByStudent(students, envios, pontuacoes, filters) {
  const participationByStudent = new Map();

  students.forEach((student) => {
    participationByStudent.set(getEntityId(student), createStudentParticipation(student));
  });

  envios.forEach((envio) => {
    getStudentIdsFromEnvio(envio).forEach((studentId) => {
      const participation = participationByStudent.get(studentId);
      if (participation) {
        setLastSubmission(participation, envio);
      }
    });
  });

  pontuacoes.forEach((pontuacao) => {
    const studentId = getEntityId(pontuacao.aluno);
    const participation = participationByStudent.get(studentId);

    if (participation && matchesPontuacaoTurma(pontuacao, filters)) {
      participation.pontuacaoAtual += Number(pontuacao.pontos) || 0;
      setLastScoreActivity(participation, pontuacao);
    }
  });

  return participationByStudent;
}

function calculateDaysWithoutSubmission(lastSubmission, referenceDate) {
  if (!lastSubmission || !lastSubmission.date) {
    return null;
  }

  const diffInMs = referenceDate.getTime() - lastSubmission.date.getTime();
  return Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
}

function buildMotivos(participation, filters, referenceDate) {
  const motivos = [];
  const diasSemEnvio = calculateDaysWithoutSubmission(participation.ultimoEnvio, referenceDate);

  if (filters.diasSemEnvioLimite !== undefined) {
    if (diasSemEnvio === null) {
      motivos.push({
        tipo: "sem_envio",
        descricao: "Aluno sem envio no período avaliado.",
        limite: filters.diasSemEnvioLimite,
        valor: null,
      });
    } else if (diasSemEnvio > filters.diasSemEnvioLimite) {
      motivos.push({
        tipo: "dias_sem_envio",
        descricao: "Aluno acima do limite de dias sem envio.",
        limite: filters.diasSemEnvioLimite,
        valor: diasSemEnvio,
      });
    }
  }

  if (filters.pontuacaoMinima !== undefined && participation.pontuacaoAtual < filters.pontuacaoMinima) {
    motivos.push({
      tipo: "pontuacao_minima",
      descricao: "Aluno abaixo da pontuação mínima configurada.",
      limite: filters.pontuacaoMinima,
      valor: participation.pontuacaoAtual,
    });
  }

  return { motivos, diasSemEnvio };
}

function serializeTurma(turma) {
  if (!turma) {
    return null;
  }

  return omitUndefined({
    id: getEntityId(turma),
    name: turma.name,
    code: turma.code,
    description: turma.description,
    status: turma.status,
  });
}

function serializeLastSubmission(ultimoEnvio) {
  if (!ultimoEnvio) {
    return null;
  }

  return {
    id: ultimoEnvio.id,
    status: ultimoEnvio.status,
    createdAt: toIsoDate(ultimoEnvio.date),
  };
}

function serializeLastActivity(ultimaAtividade) {
  if (!ultimaAtividade) {
    return null;
  }

  return {
    tipo: ultimaAtividade.tipo,
    id: ultimaAtividade.id,
    data: toIsoDate(ultimaAtividade.date),
  };
}

function serializeStudentReport(participation, filters, turma, referenceDate) {
  const { motivos, diasSemEnvio } = buildMotivos(participation, filters, referenceDate);

  if (motivos.length === 0) {
    return null;
  }

  return {
    id: getEntityId(participation.student),
    name: participation.student.name,
    email: participation.student.email,
    status: participation.student.status,
    turma: serializeTurma(turma),
    pontuacaoAtual: participation.pontuacaoAtual,
    diasSemEnvio,
    ultimoEnvio: serializeLastSubmission(participation.ultimoEnvio),
    ultimaAtividade: serializeLastActivity(participation.ultimaAtividade),
    motivos,
  };
}

function buildResumo(alunos) {
  return alunos.reduce(
    (resumo, aluno) => {
      aluno.motivos.forEach((motivo) => {
        if (motivo.tipo === "sem_envio" || motivo.tipo === "dias_sem_envio") {
          resumo.porDiasSemEnvio += 1;
        }

        if (motivo.tipo === "pontuacao_minima") {
          resumo.porPontuacaoMinima += 1;
        }
      });

      return resumo;
    },
    {
      porDiasSemEnvio: 0,
      porPontuacaoMinima: 0,
    }
  );
}

function sortLowParticipationStudents(first, second) {
  if (second.motivos.length !== first.motivos.length) {
    return second.motivos.length - first.motivos.length;
  }

  if (first.pontuacaoAtual !== second.pontuacaoAtual) {
    return first.pontuacaoAtual - second.pontuacaoAtual;
  }

  const firstDays = first.diasSemEnvio === null ? Number.POSITIVE_INFINITY : first.diasSemEnvio;
  const secondDays = second.diasSemEnvio === null ? Number.POSITIVE_INFINITY : second.diasSemEnvio;
  return secondDays - firstDays;
}

function serializeFilters(filters) {
  return omitUndefined({
    turmaId: filters.turmaId,
    startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
    endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
    diasSemEnvio: filters.diasSemEnvioLimite,
    pontuacaoMinima: filters.pontuacaoMinima,
  });
}

async function getLowParticipationReport(authenticatedUserId, query = {}) {
  await assertCanAccessReport(authenticatedUserId);

  const filters = parseFilters(query);
  const turma = await findTurma(filters.turmaId);
  const students = await findStudents(filters, turma);
  const studentIds = students.map((student) => getEntityId(student)).filter(Boolean);
  const referenceDate = filters.endDate || new Date();

  if (studentIds.length === 0) {
    return {
      filtros: serializeFilters(filters),
      criterios: {
        diasSemEnvio: filters.diasSemEnvioLimite,
        pontuacaoMinima: filters.pontuacaoMinima,
      },
      totalAlunosAvaliados: 0,
      totalBaixaParticipacao: 0,
      resumo: {
        porDiasSemEnvio: 0,
        porPontuacaoMinima: 0,
      },
      alunos: [],
    };
  }

  const [envios, pontuacoes] = await Promise.all([findEnvios(filters, studentIds), findPontuacoes(filters, studentIds)]);
  const participationByStudent = buildParticipationByStudent(students, envios || [], pontuacoes || [], filters);
  const lowParticipationStudents = Array.from(participationByStudent.values())
    .map((participation) => serializeStudentReport(participation, filters, turma, referenceDate))
    .filter(Boolean)
    .sort(sortLowParticipationStudents);

  return {
    filtros: serializeFilters(filters),
    criterios: {
      diasSemEnvio: filters.diasSemEnvioLimite,
      pontuacaoMinima: filters.pontuacaoMinima,
    },
    totalAlunosAvaliados: students.length,
    totalBaixaParticipacao: lowParticipationStudents.length,
    resumo: buildResumo(lowParticipationStudents),
    alunos: lowParticipationStudents,
  };
}

module.exports = {
  getLowParticipationReport,
};
