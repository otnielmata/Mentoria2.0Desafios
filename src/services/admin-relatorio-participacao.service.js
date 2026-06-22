const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/turma.model");
require("../models/desafio.model");
require("../models/envio-desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const GrupoDesafio = require("../models/grupo-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");

const ALLOWED_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const APPROVED_STATUS = "aprovado";
const EXTRA_POINTS_SOURCE = "pontuacao_extra";
const REJECTED_STATUS = "reprovado";
const PENDING_STATUS = "pendente";
const DEFAULT_PAGE_LIMIT = 10;

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

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createHttpError("Paginação deve usar números inteiros maiores que zero.", 400);
  }

  return parsed;
}

function parsePagination(query = {}) {
  const page = parsePositiveInteger(getFirstValue(query, ["page", "pagina"]), 1);
  const limit = Math.min(parsePositiveInteger(getFirstValue(query, ["limit", "perPage", "per_page"]), DEFAULT_PAGE_LIMIT), 100);

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

function parseFilters(query = {}) {
  const period = parsePeriodFilters(query);

  return {
    turmaId: parseObjectIdFilter(query, ["turmaId", "turma_id", "turma"], "Turma deve ser um identificador válido."),
    pilarId: parseObjectIdFilter(query, ["pilarId", "pilar_id", "pilar"], "Pilar deve ser um identificador válido."),
    startDate: period.startDate,
    endDate: period.endDate,
    createdAt: period.createdAt,
    diasSemEnvioLimite: parseNumberFilter(
      query,
      ["diasSemEnvio", "maxDiasSemEnvio", "limiteDiasSemEnvio", "daysWithoutSubmissionLimit"],
      "diasSemEnvio deve ser um número inteiro maior ou igual a zero.",
      { integer: true }
    ),
    pontuacaoMinima: parseNumberFilter(
      query,
      ["pontuacaoMinima", "minPontuacao", "minPoints", "pontosMinimos"],
      "pontuacaoMinima deve ser um número maior ou igual a zero."
    ),
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

function buildGrupoQuery(filters) {
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
      select: "title description points type pilar pilares",
      populate: [
        { path: "pilar", select: "name description status" },
        { path: "pilares.pilar", select: "name description status" },
      ],
    })
    .sort({ createdAt: -1 })
    .lean();
}

async function findChallengeGroups(filters) {
  return GrupoDesafio.find(buildGrupoQuery(filters))
    .populate({ path: "turma", select: "name code description status" })
    .populate({
      path: "desafio",
      select: "title description points type pilar pilares maxParticipantes status deliveryDate",
      populate: [
        { path: "pilar", select: "name description status" },
        { path: "pilares.pilar", select: "name description status" },
      ],
    })
    .populate({ path: "participantes", select: "name email role status" })
    .sort({ createdAt: -1 })
    .lean();
}

async function findEnviosByGroups(groupIds) {
  if (groupIds.length === 0) {
    return [];
  }

  return EnvioDesafio.find({ grupo: { $in: groupIds } })
    .populate({ path: "aluno", select: "name email role status" })
    .populate({ path: "participantes", select: "name email role status" })
    .sort({ createdAt: -1 })
    .lean();
}

async function findPontuacoes() {
  return Pontuacao.find({})
    .populate({ path: "aluno", select: "name email role status turmas" })
    .populate({
      path: "envio",
      select: "status turma createdAt approvedAt evaluatedAt approvedBy evaluatedBy",
      populate: [
        {
          path: "turma",
          select: "name code description status",
        },
        { path: "approvedBy", select: "name email role status" },
        { path: "evaluatedBy", select: "name email role status" },
      ],
    })
    .populate({
      path: "desafio",
      select: "title description points type pilar pilares",
      populate: [
        { path: "pilar", select: "name description status" },
        { path: "pilares.pilar", select: "name description status" },
      ],
    })
    .populate({ path: "pilares.pilar", select: "name description status" })
    .populate({ path: "createdBy", select: "name email role status" })
    .sort({ createdAt: -1 })
    .lean();
}

function buildStudentQuery(filters) {
  const query = {
    role: STUDENT_ROLE,
    status: ACTIVE_STATUS,
  };

  if (filters.turmaId) {
    query.turmas = filters.turmaId;
  }

  return query;
}

async function findStudents(filters) {
  return User.find(buildStudentQuery(filters)).select("name email role status turmas").lean();
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

  return entityHasPilar(entity, filters.pilarId);
}

function matchesTurmaByEnvio(entity, filters) {
  if (!filters.turmaId) {
    return true;
  }

  return getEntityId(entity.turma) === filters.turmaId;
}

function alunoHasTurma(pontuacao, turmaId) {
  const turmas = Array.isArray(pontuacao && pontuacao.aluno && pontuacao.aluno.turmas) ? pontuacao.aluno.turmas : [];
  return turmas.some((turma) => getEntityId(turma) === turmaId);
}

function matchesPontuacaoFilters(pontuacao, filters) {
  if (
    pontuacao &&
    pontuacao.aluno &&
    normalizeText(pontuacao.source) === EXTRA_POINTS_SOURCE &&
    Number.isFinite(Number(pontuacao.pontos))
  ) {
    return (
      matchesDate(pontuacao, filters) &&
      matchesPilar(pontuacao, filters) &&
      (!filters.turmaId || alunoHasTurma(pontuacao, filters.turmaId))
    );
  }

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

function getDesafioPilares(desafio) {
  const configured = Array.isArray(desafio && desafio.pilares)
    ? desafio.pilares.map(serializePilarPontuacao).filter((item) => item && item.pilarId)
    : [];
  if (configured.length > 0) return configured;

  const pilar = desafio && desafio.pilar;
  return pilar ? [{ pilar: serializePilar(pilar), pilarId: getEntityId(pilar), pontos: Number((desafio && desafio.points) || 0) }] : [];
}

function entityHasPilar(entity, pilarId) {
  const ownPilares = Array.isArray(entity && entity.pilares)
    ? entity.pilares.map(serializePilarPontuacao).filter((item) => item && item.pilarId)
    : [];
  if (ownPilares.length > 0) return ownPilares.some((item) => item.pilarId === pilarId);

  return getDesafioPilares(entity && entity.desafio).some((item) => item.pilarId === pilarId);
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

function serializeAluno(aluno) {
  if (!aluno) {
    return null;
  }

  return omitUndefined({
    id: getEntityId(aluno),
    name: aluno.name,
    email: aluno.email,
    role: aluno.role,
    status: aluno.status,
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
    getPontuacaoPilares(pontuacao).forEach((item) => {
      const pilarId = item.pilarId || "sem-pilar";
      const current = groupedByPilar.get(pilarId) || {
        pilar: item.pilar,
        quantidade: 0,
        totalPontos: 0,
      };

      current.quantidade += 1;
      current.totalPontos += Number(item.pontos || 0);
      groupedByPilar.set(pilarId, current);
    });
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

function createStatusTotals() {
  return {
    aprovado: 0,
    reprovado: 0,
    pendente: 0,
    ajuste: 0,
    cancelado: 0,
    outros: 0,
  };
}

function incrementStatus(totals, statusValue) {
  const status = normalizeText(statusValue);

  if (Object.prototype.hasOwnProperty.call(totals, status)) {
    totals[status] += 1;
  } else {
    totals.outros += 1;
  }
}

function toIsoDate(date) {
  if (!date) {
    return null;
  }

  const parsedDate = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

function getStudentIdsFromEnvio(envio) {
  const studentIds = new Set();
  const alunoId = getEntityId(envio && envio.aluno);

  if (alunoId) {
    studentIds.add(alunoId);
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

function serializeLastSubmission(ultimoEnvio) {
  if (!ultimoEnvio) {
    return null;
  }

  return {
    id: ultimoEnvio.id,
    status: ultimoEnvio.status,
    createdAt: toIsoDate(ultimoEnvio.createdAt),
  };
}

function createStudentParticipation(student) {
  return {
    aluno: serializeAluno(student),
    totalEnvios: 0,
    totaisPorStatus: createStatusTotals(),
    totalPontos: 0,
    desafiosAprovados: 0,
    envioIdsAprovados: new Set(),
    ultimoEnvio: null,
  };
}

function updateLastSubmission(participation, envio) {
  const createdAt = getCreatedAt(envio);

  if (!createdAt) {
    return;
  }

  if (!participation.ultimoEnvio || createdAt > participation.ultimoEnvio.createdAt) {
    participation.ultimoEnvio = {
      id: getEntityId(envio),
      status: envio.status,
      createdAt,
    };
  }
}

function buildParticipationByStudent(students, envios, pontuacoes) {
  const participationByStudent = new Map();

  students.forEach((student) => {
    participationByStudent.set(getEntityId(student), createStudentParticipation(student));
  });

  envios.forEach((envio) => {
    getStudentIdsFromEnvio(envio).forEach((studentId) => {
      const participation = participationByStudent.get(studentId);

      if (participation) {
        participation.totalEnvios += 1;
        incrementStatus(participation.totaisPorStatus, envio.status);
        updateLastSubmission(participation, envio);
      }
    });
  });

  pontuacoes.forEach((pontuacao) => {
    const studentId = getEntityId(pontuacao.aluno);
    const participation = participationByStudent.get(studentId);

    if (participation) {
      participation.totalPontos += Number(pontuacao.pontos) || 0;
      const envioId = getEntityId(pontuacao.envio);
      if (envioId) participation.envioIdsAprovados.add(envioId);
    }
  });

  return Array.from(participationByStudent.values());
}

function serializeStudentParticipation(participation) {
  return {
    aluno: participation.aluno,
    totalEnvios: participation.totalEnvios,
    totaisPorStatus: participation.totaisPorStatus,
    totalPontos: participation.totalPontos,
    desafiosAprovados: participation.envioIdsAprovados.size,
    ultimoEnvio: serializeLastSubmission(participation.ultimoEnvio),
  };
}

function createTurmaParticipation(turma) {
  return {
    turma: serializeTurma(turma),
    totalEnvios: 0,
    totaisPorStatus: createStatusTotals(),
    totalPontos: 0,
    alunoIds: new Set(),
    envioIdsAprovados: new Set(),
  };
}

function ensureTurmaParticipation(groupedByTurma, turma) {
  const turmaId = getEntityId(turma) || "sem-turma";
  const current = groupedByTurma.get(turmaId) || createTurmaParticipation(turma);
  groupedByTurma.set(turmaId, current);
  return current;
}

function buildParticipationByTurma(envios, pontuacoes) {
  const groupedByTurma = new Map();

  envios.forEach((envio) => {
    const current = ensureTurmaParticipation(groupedByTurma, envio.turma);
    current.totalEnvios += 1;
    incrementStatus(current.totaisPorStatus, envio.status);
    getStudentIdsFromEnvio(envio).forEach((studentId) => current.alunoIds.add(studentId));
  });

  pontuacoes.forEach((pontuacao) => {
    const turmas = pontuacao.envio && pontuacao.envio.turma ? [pontuacao.envio.turma] : pontuacao.aluno && Array.isArray(pontuacao.aluno.turmas) ? pontuacao.aluno.turmas : [];
    const turmasToScore = turmas.length > 0 ? turmas : [null];

    turmasToScore.forEach((turma) => {
      const current = ensureTurmaParticipation(groupedByTurma, turma);
      current.totalPontos += Number(pontuacao.pontos) || 0;
      current.alunoIds.add(getEntityId(pontuacao.aluno));
      const envioId = getEntityId(pontuacao.envio);
      if (envioId) current.envioIdsAprovados.add(envioId);
    });
  });

  return Array.from(groupedByTurma.values()).map((participation) => ({
    turma: participation.turma,
    totalEnvios: participation.totalEnvios,
    totaisPorStatus: participation.totaisPorStatus,
    totalPontos: participation.totalPontos,
    participantes: participation.alunoIds.size,
    desafiosAprovados: participation.envioIdsAprovados.size,
  }));
}

function hasLowParticipationCriteria(filters) {
  return filters.diasSemEnvioLimite !== undefined || filters.pontuacaoMinima !== undefined;
}

function calculateDaysWithoutSubmission(lastSubmission, referenceDate) {
  if (!lastSubmission || !lastSubmission.createdAt) {
    return null;
  }

  const diffInMs = referenceDate.getTime() - lastSubmission.createdAt.getTime();
  return Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)));
}

function buildLowParticipationReasons(participation, filters, referenceDate) {
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

  if (filters.pontuacaoMinima !== undefined && participation.totalPontos < filters.pontuacaoMinima) {
    motivos.push({
      tipo: "pontuacao_minima",
      descricao: "Aluno abaixo da pontuação mínima configurada.",
      limite: filters.pontuacaoMinima,
      valor: participation.totalPontos,
    });
  }

  return {
    motivos,
    diasSemEnvio,
  };
}

function buildLowParticipationSummary(alunos) {
  return alunos.reduce(
    (summary, aluno) => {
      aluno.motivos.forEach((motivo) => {
        if (motivo.tipo === "sem_envio" || motivo.tipo === "dias_sem_envio") {
          summary.porDiasSemEnvio += 1;
        }

        if (motivo.tipo === "pontuacao_minima") {
          summary.porPontuacaoMinima += 1;
        }
      });

      return summary;
    },
    { porDiasSemEnvio: 0, porPontuacaoMinima: 0 }
  );
}

function sortLowParticipationStudents(first, second) {
  if (second.motivos.length !== first.motivos.length) {
    return second.motivos.length - first.motivos.length;
  }

  if (first.totalPontos !== second.totalPontos) {
    return first.totalPontos - second.totalPontos;
  }

  const firstDays = first.diasSemEnvio === null ? Number.POSITIVE_INFINITY : first.diasSemEnvio;
  const secondDays = second.diasSemEnvio === null ? Number.POSITIVE_INFINITY : second.diasSemEnvio;
  return secondDays - firstDays;
}

function buildLowParticipation(participationByStudent, filters) {
  const criterios = {
    diasSemEnvio: filters.diasSemEnvioLimite,
    pontuacaoMinima: filters.pontuacaoMinima,
  };

  if (!hasLowParticipationCriteria(filters)) {
    return {
      aplicado: false,
      criterios,
      totalAlunosAvaliados: participationByStudent.length,
      totalBaixaParticipacao: 0,
      resumo: { porDiasSemEnvio: 0, porPontuacaoMinima: 0 },
      alunos: [],
    };
  }

  const referenceDate = filters.endDate || new Date();
  const alunos = participationByStudent
    .map((participation) => {
      const { motivos, diasSemEnvio } = buildLowParticipationReasons(participation, filters, referenceDate);

      if (motivos.length === 0) {
        return null;
      }

      return {
        aluno: participation.aluno,
        totalEnvios: participation.totalEnvios,
        totalPontos: participation.totalPontos,
        diasSemEnvio,
        ultimoEnvio: serializeLastSubmission(participation.ultimoEnvio),
        motivos,
      };
    })
    .filter(Boolean)
    .sort(sortLowParticipationStudents);

  return {
    aplicado: true,
    criterios,
    totalAlunosAvaliados: participationByStudent.length,
    totalBaixaParticipacao: alunos.length,
    resumo: buildLowParticipationSummary(alunos),
    alunos,
  };
}

function serializeFilters(filters) {
  return omitUndefined({
    turmaId: filters.turmaId,
    pilarId: filters.pilarId,
    startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
    endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
    diasSemEnvio: filters.diasSemEnvioLimite,
    pontuacaoMinima: filters.pontuacaoMinima,
  });
}

async function getParticipationReport(authenticatedUserId, query = {}) {
  await getAuthorizedReviewer(authenticatedUserId);

  const filters = parseFilters(query);
  const [students, envios, pontuacoes] = await Promise.all([findStudents(filters), findEnvios(filters), findPontuacoes()]);
  const filteredEnvios = (envios || []).filter(
    (envio) => matchesDate(envio, filters) && matchesPilar(envio, filters) && matchesTurmaByEnvio(envio, filters)
  );
  const statusTotals = buildStatusTotals(filteredEnvios);
  const filteredPontuacoes = (pontuacoes || []).filter((pontuacao) => matchesPontuacaoFilters(pontuacao, filters));
  const participationByStudent = buildParticipationByStudent(students || [], filteredEnvios, filteredPontuacoes);

  return {
    filtros: serializeFilters(filters),
    periodo: {
      startDate: filters.startDate ? filters.startDate.toISOString() : null,
      endDate: filters.endDate ? filters.endDate.toISOString() : null,
    },
    quantidadeEnvios: filteredEnvios.length,
    totaisPorStatus: statusTotals,
    resumo: {
      aprovados: statusTotals[APPROVED_STATUS],
      reprovados: statusTotals[REJECTED_STATUS],
      pendentes: statusTotals[PENDING_STATUS],
    },
    distribuicaoPontos: buildPointDistribution(filteredPontuacoes),
    participacaoPorAluno: participationByStudent.map(serializeStudentParticipation),
    participacaoPorTurma: buildParticipationByTurma(filteredEnvios, filteredPontuacoes),
    baixaParticipacao: buildLowParticipation(participationByStudent, filters),
  };
}

function matchesStudentSearch(student, search) {
  if (!search) {
    return true;
  }

  const needle = normalizeText(search);
  return normalizeText(student.name).includes(needle) || normalizeText(student.email).includes(needle);
}

function serializeDesafioResumo(desafio) {
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
    type: desafio.type,
  });
}

function getPontuacaoOrigin(pontuacao) {
  return normalizeText(pontuacao && pontuacao.source) === EXTRA_POINTS_SOURCE ? "ponto_extra" : "desafio";
}

function getPontuacaoResponsavel(pontuacao) {
  if (getPontuacaoOrigin(pontuacao) === "ponto_extra") {
    return pontuacao.createdBy || null;
  }

  return (pontuacao.envio && (pontuacao.envio.approvedBy || pontuacao.envio.evaluatedBy)) || pontuacao.createdBy || null;
}

function getPontuacaoLaunchDate(pontuacao) {
  if (getPontuacaoOrigin(pontuacao) === "ponto_extra") {
    return toIsoDate(pontuacao.createdAt);
  }

  return toIsoDate((pontuacao.envio && (pontuacao.envio.approvedAt || pontuacao.envio.evaluatedAt)) || pontuacao.createdAt);
}

function serializePontuacaoPilarDetail(pontuacao, pilarItem, pontos) {
  const origem = getPontuacaoOrigin(pontuacao);

  return omitUndefined({
    dataLancamento: getPontuacaoLaunchDate(pontuacao),
    professor: serializeAluno(getPontuacaoResponsavel(pontuacao)),
    responsavel: serializeAluno(getPontuacaoResponsavel(pontuacao)),
    pilar: pilarItem.pilar,
    pilarId: pilarItem.pilarId,
    origem,
    tipo: origem,
    source: pontuacao.source,
    pontos,
    points: pontos,
    motivo: pontuacao.motivo,
    desafio: serializeDesafioResumo(pontuacao.desafio),
  });
}

function buildStudentPillarRows(students, pontuacoes, filters) {
  const groupedByStudent = new Map();

  (students || []).forEach((student) => {
    groupedByStudent.set(getEntityId(student), {
      aluno: serializeAluno(student),
      totalPontos: 0,
      pilares: new Map(),
      detalhesPontosPorPilar: [],
    });
  });

  (pontuacoes || []).forEach((pontuacao) => {
    const studentId = getEntityId(pontuacao.aluno);
    const current = groupedByStudent.get(studentId);

    if (!current) {
      return;
    }

    getPontuacaoPilares(pontuacao)
      .filter((item) => !filters.pilarId || item.pilarId === filters.pilarId)
      .forEach((item) => {
        const pilarId = item.pilarId || "sem-pilar";
        const pilarPoints = Number(item.pontos || 0);
        const pilarRow = current.pilares.get(pilarId) || {
          pilar: item.pilar,
          pilarId,
          pontos: 0,
          points: 0,
          lancamentos: [],
        };
        const detail = serializePontuacaoPilarDetail(pontuacao, item, pilarPoints);

        pilarRow.pontos += pilarPoints;
        pilarRow.points += pilarPoints;
        pilarRow.lancamentos.push(detail);
        current.detalhesPontosPorPilar.push(detail);
        current.totalPontos += pilarPoints;
        current.pilares.set(pilarId, pilarRow);
      });
  });

  return Array.from(groupedByStudent.values())
    .map((row) => ({
      aluno: row.aluno,
      totalPontos: row.totalPontos,
      pontosPorPilar: Array.from(row.pilares.values()).sort((first, second) => second.pontos - first.pontos),
      detalhesPontosPorPilar: row.detalhesPontosPorPilar.sort((first, second) => {
        const firstDate = first.dataLancamento ? new Date(first.dataLancamento).getTime() : 0;
        const secondDate = second.dataLancamento ? new Date(second.dataLancamento).getTime() : 0;
        return secondDate - firstDate;
      }),
    }))
    .sort((first, second) => {
      if (second.totalPontos !== first.totalPontos) return second.totalPontos - first.totalPontos;
      return normalizeText(first.aluno.name).localeCompare(normalizeText(second.aluno.name), "pt-BR");
    });
}

async function getStudentPillarReport(authenticatedUserId, query = {}) {
  await getAuthorizedReviewer(authenticatedUserId);

  const filters = parseFilters(query);
  const pagination = parsePagination(query);
  const search = String(getFirstValue(query, ["search", "busca", "nome", "aluno"]) || "").trim();
  const [students, pontuacoes] = await Promise.all([findStudents(filters), findPontuacoes()]);
  const filteredPontuacoes = (pontuacoes || []).filter((pontuacao) => matchesPontuacaoFilters(pontuacao, filters));
  const rows = buildStudentPillarRows(students || [], filteredPontuacoes, filters).filter((row) => matchesStudentSearch(row.aluno, search));
  const paginatedRows = rows.slice(pagination.skip, pagination.skip + pagination.limit);

  return {
    filtros: {
      ...serializeFilters(filters),
      search: search || undefined,
    },
    pagination: buildPagination(rows.length, pagination.page, pagination.limit),
    alunos: paginatedRows,
    relatorio: paginatedRows,
  };
}

function serializeGroupSubmission(envio) {
  if (!envio) {
    return null;
  }

  return omitUndefined({
    id: getEntityId(envio),
    status: envio.status,
    aluno: serializeAluno(envio.aluno),
    participantes: Array.isArray(envio.participantes) ? envio.participantes.map(serializeAluno) : [],
    enviadoEm: toIsoDate(envio.createdAt),
    createdAt: toIsoDate(envio.createdAt),
    avaliadoEm: toIsoDate(envio.evaluatedAt || envio.approvedAt),
    aprovadoEm: toIsoDate(envio.approvedAt),
  });
}

function isGroupFormed(grupo) {
  const totalParticipantes = Array.isArray(grupo && grupo.participantes) ? grupo.participantes.length : 0;
  const maxParticipantes = Number((grupo && grupo.maxParticipantes) || 0);

  return normalizeText(grupo && grupo.status) === "completo" || (maxParticipantes > 0 && totalParticipantes >= maxParticipantes);
}

function buildLatestSubmissionByGroup(envios) {
  const latestByGroup = new Map();

  (envios || []).forEach((envio) => {
    const groupId = getEntityId(envio && envio.grupo);
    if (!groupId) {
      return;
    }

    const current = latestByGroup.get(groupId);
    const currentTime = getCreatedAt(current) ? getCreatedAt(current).getTime() : 0;
    const nextTime = getCreatedAt(envio) ? getCreatedAt(envio).getTime() : 0;

    if (!current || nextTime >= currentTime) {
      latestByGroup.set(groupId, envio);
    }
  });

  return latestByGroup;
}

function serializeChallengeGroupRow(grupo, envio) {
  const participantes = Array.isArray(grupo && grupo.participantes) ? grupo.participantes.map(serializeAluno) : [];
  const grupoFormado = isGroupFormed(grupo);
  const statusEnvio = envio ? envio.status : "sem_envio";

  return omitUndefined({
    id: getEntityId(grupo),
    desafio: serializeDesafioResumo(grupo && grupo.desafio),
    tituloDesafio: (grupo && grupo.desafio && grupo.desafio.title) || "Desafio não informado",
    turma: serializeTurma(grupo && grupo.turma),
    participantes,
    integrantes: participantes,
    nomesIntegrantes: participantes.map((participante) => participante.name).filter(Boolean),
    totalParticipantes: participantes.length,
    maxParticipantes: Number((grupo && grupo.maxParticipantes) || 0),
    modalidade: normalizeText(grupo && grupo.modalidade) === "ingles" ? "ingles" : "normal",
    grupoFormado,
    statusGrupo: grupo && grupo.status,
    enviadoParaAprovacao: Boolean(envio),
    statusEnvio,
    pendente: normalizeText(statusEnvio) === PENDING_STATUS,
    aprovado: normalizeText(statusEnvio) === APPROVED_STATUS,
    envio: serializeGroupSubmission(envio),
    createdAt: toIsoDate(grupo && grupo.createdAt),
    updatedAt: toIsoDate(grupo && grupo.updatedAt),
  });
}

function matchesGroupReportSearch(row, search) {
  if (!search) {
    return true;
  }

  const needle = normalizeText(search);
  const participantes = Array.isArray(row.participantes) ? row.participantes : [];
  const values = [
    row.tituloDesafio,
    row.statusGrupo,
    row.statusEnvio,
    row.turma && row.turma.name,
    row.turma && row.turma.code,
    ...participantes.flatMap((participante) => [participante.name, participante.email]),
  ];

  return values.some((value) => normalizeText(value).includes(needle));
}

function buildChallengeGroupSummary(rows) {
  return rows.reduce(
    (summary, row) => {
      summary.totalGrupos += 1;
      if (row.grupoFormado) summary.gruposFormados += 1;
      if (row.enviadoParaAprovacao) summary.enviosRealizados += 1;
      if (row.pendente) summary.pendentes += 1;
      if (row.aprovado) summary.aprovados += 1;
      return summary;
    },
    {
      totalGrupos: 0,
      gruposFormados: 0,
      enviosRealizados: 0,
      pendentes: 0,
      aprovados: 0,
    }
  );
}

async function getChallengeGroupsReport(authenticatedUserId, query = {}) {
  await getAuthorizedReviewer(authenticatedUserId);

  const filters = parseFilters(query);
  const pagination = parsePagination(query);
  const search = String(getFirstValue(query, ["search", "busca", "nome", "desafio"]) || "").trim();
  const grupos = (await findChallengeGroups(filters)).filter((grupo) => matchesDate(grupo, filters) && matchesPilar({ desafio: grupo.desafio }, filters));
  const groupIds = grupos.map(getEntityId).filter(Boolean);
  const latestSubmissionByGroup = buildLatestSubmissionByGroup(await findEnviosByGroups(groupIds));
  const rows = grupos
    .map((grupo) => serializeChallengeGroupRow(grupo, latestSubmissionByGroup.get(getEntityId(grupo))))
    .filter((row) => matchesGroupReportSearch(row, search));
  const paginatedRows = rows.slice(pagination.skip, pagination.skip + pagination.limit);

  return {
    filtros: {
      ...serializeFilters(filters),
      search: search || undefined,
    },
    pagination: buildPagination(rows.length, pagination.page, pagination.limit),
    resumo: buildChallengeGroupSummary(rows),
    grupos: paginatedRows,
    relatorio: paginatedRows,
  };
}

module.exports = {
  getChallengeGroupsReport,
  getParticipationReport,
  getStudentPillarReport,
};
