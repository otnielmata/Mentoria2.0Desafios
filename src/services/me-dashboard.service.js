const mongoose = require("mongoose");
require("../models/pilar.model");
const Desafio = require("../models/desafio.model");
require("../models/envio-desafio.model");
const EnvioDesafio = require("../models/envio-desafio.model");
const Pontuacao = require("../models/pontuacao.model");
const Turma = require("../models/turma.model");
const User = require("../models/user.model");
const { getStudentCouponSummary } = require("./cupom.service");
const { inactivateExpiredChallenges } = require("./desafio-prazo.service");
const { buildChecklistSummaryByStudent, getChecklistSummaryByStudentContext } = require("./plano-estudo.service");

const STUDENT_ROLE = "aluno";
const APPROVED_STATUS = "aprovado";
const EXTRA_POINTS_SOURCE = "pontuacao_extra";
const PENDING_STATUS = "pendente";
const LAST_SUBMISSIONS_LIMIT = 5;
const ACTIVE_STATUS = "ativo";

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
    .populate({ path: "aluno", select: "turmas" })
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

async function findScopePontuacoes(scope) {
  if (isEmptyScope(scope)) {
    return [];
  }

  return Pontuacao.find({})
    .populate({ path: "aluno", select: "name email role status turmas" })
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
      select: "title description points type pilar pilares",
      populate: [
        { path: "pilar", select: "name description status" },
        { path: "pilares.pilar", select: "name description status" },
      ],
    })
    .populate({ path: "turma", select: "name code description status" })
    .sort({ createdAt: -1 })
    .lean();
}

async function countActiveDesafios() {
  await inactivateExpiredChallenges();
  return Desafio.countDocuments({ status: ACTIVE_STATUS });
}

function isApprovedPontuacao(pontuacao) {
  if (
    pontuacao &&
    pontuacao.aluno &&
    normalizeText(pontuacao.source) === EXTRA_POINTS_SOURCE &&
    Number.isFinite(Number(pontuacao.pontos))
  ) {
    return true;
  }

  return (
    pontuacao &&
    pontuacao.envio &&
    pontuacao.desafio &&
    normalizeText(pontuacao.envio.status) === APPROVED_STATUS &&
    Number.isFinite(Number(pontuacao.pontos))
  );
}

function alunoHasTurma(pontuacao, turmaId) {
  const turmas = Array.isArray(pontuacao && pontuacao.aluno && pontuacao.aluno.turmas) ? pontuacao.aluno.turmas : [];
  return turmas.some((turma) => getEntityId(turma) === turmaId);
}

function matchesScopeByEnvio(pontuacao, scope) {
  const envioTurmaId = getEntityId(pontuacao.envio && pontuacao.envio.turma);
  if (envioTurmaId) {
    return scope.turmaIds.includes(envioTurmaId);
  }

  return scope.turmaIds.some((turmaId) => alunoHasTurma(pontuacao, turmaId));
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

function getDesafioPilares(desafio) {
  const configured = Array.isArray(desafio && desafio.pilares)
    ? desafio.pilares.map(serializePilarPontuacao).filter((item) => item && item.pilarId)
    : [];
  if (configured.length > 0) return configured;

  const points = Number((desafio && desafio.points) || 0);
  return desafio && desafio.pilar && points > 0
    ? [{ pilar: serializePilar(desafio.pilar), pilarId: getEntityId(desafio.pilar), pontos: points, points }]
    : [];
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
    pilares: getDesafioPilares(desafio),
    pontosPorPilar: getDesafioPilares(desafio),
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
    getPontuacaoPilares(pontuacao).forEach((item) => {
      const pilarId = item.pilarId || "sem-pilar";
      const current = groupedByPilar.get(pilarId) || {
        pilar: item.pilar,
        pontos: 0,
        envioIds: new Set(),
      };

      current.pontos += Number(item.pontos || 0);
      const envioId = getEntityId(pontuacao.envio);
      if (envioId) current.envioIds.add(envioId);
      groupedByPilar.set(pilarId, current);
    });
  });

  return Array.from(groupedByPilar.values()).map((item) => ({
    pilar: item.pilar,
    pontos: item.pontos,
    desafiosAprovados: item.envioIds.size,
  }));
}

function buildDesafiosEnviados(envios) {
  const totaisPorStatus = {
    aprovado: 0,
    reprovado: 0,
    pendente: 0,
    ajuste: 0,
    cancelado: 0,
    outros: 0,
  };

  (envios || []).forEach((envio) => {
    const status = normalizeText(envio.status);

    if (Object.prototype.hasOwnProperty.call(totaisPorStatus, status)) {
      totaisPorStatus[status] += 1;
    } else {
      totaisPorStatus.outros += 1;
    }
  });

  return {
    total: (envios || []).length,
    totaisPorStatus,
  };
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
    const envioId = getEntityId(pontuacao.envio);
    if (envioId) current.envioIds.add(envioId);
    groupedByAluno.set(alunoId, current);
  });

  return Array.from(groupedByAluno.values()).map((item) => ({
    alunoId: getEntityId(item.aluno),
    totalPontos: item.totalPontos,
    desafiosAprovados: item.envioIds.size,
  }));
}

function itemMatchesPlanningScope(item, scope) {
  const turmas = Array.isArray(item && item.aluno && item.aluno.turmas) ? item.aluno.turmas : [];
  return turmas.some((turma) => scope.turmaIds.includes(getEntityId(turma)));
}

function mergeChecklistPointsIntoRankingRows(rows, checklistSummaryByStudent, studentsById) {
  const rowsByStudent = new Map();

  (rows || []).forEach((row) => {
    const checklistPoints = Number((checklistSummaryByStudent.get(row.alunoId) || {}).totalPontos || 0);
    rowsByStudent.set(row.alunoId, {
      ...row,
      totalPontos: Number(row.totalPontos || 0) + checklistPoints,
    });
  });

  checklistSummaryByStudent.forEach((summary, studentId) => {
    const checklistPoints = Number((summary || {}).totalPontos || 0);
    if (checklistPoints <= 0 || rowsByStudent.has(studentId)) return;

    const student = studentsById.get(studentId);
    if (!student) return;

    rowsByStudent.set(studentId, {
      alunoId: studentId,
      totalPontos: checklistPoints,
      desafiosAprovados: 0,
    });
  });

  return Array.from(rowsByStudent.values());
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

function getStudentRankingPosition(authenticatedUserId, scopePontuacoes, checklistSummaryByStudent = new Map(), studentsById = new Map()) {
  const ranking = assignPositions(sortRankingRows(mergeChecklistPointsIntoRankingRows(buildRankingRows(scopePontuacoes), checklistSummaryByStudent, studentsById)));
  const studentRanking = ranking.find((item) => item.alunoId === authenticatedUserId);

  return {
    posicao: studentRanking ? studentRanking.posicao : null,
    totalParticipantes: ranking.length,
    criterioDesempate: "posicao_compartilhada_id",
  };
}

function emptyDashboard(scope, activeChallengesCount = 0) {
  return {
    totalPontos: 0,
    posicaoRanking: null,
    totalParticipantesRanking: 0,
    ranking: {
      posicao: null,
      totalParticipantes: 0,
      criterioDesempate: "posicao_compartilhada_id",
    },
    desafiosEnviados: buildDesafiosEnviados([]),
    quantidadeDesafios: activeChallengesCount,
    desafiosAtivos: activeChallengesCount,
    desafiosAprovados: 0,
    pendencias: 0,
    pontosPorPilar: [],
    cupons: {
      totalCupons: 0,
      cuponsValidados: 0,
      cuponsPendentes: 0,
      cuponsComNumeroSorte: 0,
      cuponsAguardandoNumeroSorte: 0,
      ultimoConquistadoEm: null,
      ultimaValidacaoEm: null,
      ultimoNumeroSorteDistribuidoEm: null,
      numerosDaSorte: [],
      itens: [],
    },
    evolucaoPorCategoria: [],
    ultimosEnvios: [],
    escopo: {
      turmaIds: scope.turmaIds,
    },
  };
}

async function getMyDashboard(authenticatedUserId) {
  await getAuthenticatedStudent(authenticatedUserId);

  const scope = await buildScope(authenticatedUserId);
  const activeChallengesCount = await countActiveDesafios();

  if (isEmptyScope(scope)) {
    return emptyDashboard(scope, activeChallengesCount);
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
  const approvedEnvioIds = new Set(validStudentPontuacoes.map((pontuacao) => getEntityId(pontuacao.envio)).filter(Boolean));
  const checklistContext = await getChecklistSummaryByStudentContext({ populateAluno: true });
  const planningItemsInScope = (checklistContext.items || []).filter((item) => itemMatchesPlanningScope(item, scope));
  const checklistSummaryByStudent = buildChecklistSummaryByStudent(planningItemsInScope);
  const studentChecklistSummary = checklistSummaryByStudent.get(authenticatedUserId) || { totalPontos: 0, totalTarefas: 0, tarefasConcluidas: 0, diasComCheck: 0, semanas: [] };
  const cupons = await getStudentCouponSummary(authenticatedUserId, { sync: true, populateValidationSource: true });
  const ranking = getStudentRankingPosition(authenticatedUserId, validScopePontuacoes, checklistSummaryByStudent, checklistContext.studentsById || new Map());
  const pontosPorPilar = buildPontosPorPilar(validStudentPontuacoes);

  return {
    totalPontos: validStudentPontuacoes.reduce((total, pontuacao) => total + Number(pontuacao.pontos), 0) + Number(studentChecklistSummary.totalPontos || 0),
    posicaoRanking: ranking.posicao,
    totalParticipantesRanking: ranking.totalParticipantes,
    ranking,
    desafiosEnviados: buildDesafiosEnviados(studentEnvios || []),
    quantidadeDesafios: activeChallengesCount,
    desafiosAtivos: activeChallengesCount,
    desafiosAprovados: approvedEnvioIds.size,
    pendencias: (studentEnvios || []).filter((envio) => normalizeText(envio.status) === PENDING_STATUS).length,
    pontosPorPilar,
    checklistPlanejamento: studentChecklistSummary,
    cupons,
    evolucaoPorCategoria: pontosPorPilar,
    ultimosEnvios: (studentEnvios || []).slice(0, LAST_SUBMISSIONS_LIMIT).map(serializeEnvio),
    escopo: {
      turmaIds: scope.turmaIds,
    },
  };
}

module.exports = {
  getMyDashboard,
};
