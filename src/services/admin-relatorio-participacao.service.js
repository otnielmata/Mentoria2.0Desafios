const mongoose = require("mongoose");
require("../models/pilar.model");
require("../models/turma.model");
require("../models/desafio.model");
require("../models/envio-desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");

const ALLOWED_ROLES = ["professor", "admin"];
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
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
      select: "title description points type pilar pilares",
      populate: [
        { path: "pilar", select: "name description status" },
        { path: "pilares.pilar", select: "name description status" },
      ],
    })
    .populate({ path: "pilares.pilar", select: "name description status" })
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
  return date ? date.toISOString() : null;
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
      participation.envioIdsAprovados.add(getEntityId(pontuacao.envio));
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
    const current = ensureTurmaParticipation(groupedByTurma, pontuacao.envio && pontuacao.envio.turma);
    current.totalPontos += Number(pontuacao.pontos) || 0;
    current.alunoIds.add(getEntityId(pontuacao.aluno));
    current.envioIdsAprovados.add(getEntityId(pontuacao.envio));
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

module.exports = {
  getParticipationReport,
};
