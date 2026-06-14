function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return toNumber(value, null);
}

function getDashboardPayload(payload = {}) {
  return payload.dashboard || payload.data || payload;
}

function getNestedObject(source = {}, key) {
  const nested = source?.[key];

  return nested && typeof nested === "object" ? nested : {};
}

function pickNestedObject(source = {}, keys = []) {
  const foundKey = keys.find((key) => {
    const value = source?.[key];

    return value && typeof value === "object";
  });

  return foundKey ? source[foundKey] : {};
}

function getEntityName(entity, fallback = "Aluno") {
  if (!entity || typeof entity !== "object") {
    return String(entity || fallback);
  }

  return String(entity.name || entity.nome || entity.fullName || entity.nomeCompleto || fallback);
}

function getListPayload(source = {}, keys = []) {
  const foundKey = keys.find((key) => Array.isArray(source[key]));

  return foundKey ? source[foundKey] : [];
}

export function toPillarScoreDto(item = {}) {
  return {
    id: String(pickFirst(item, ["id", "_id", "pilar_id", "pilarId", "nome", "name"], "")),
    name: String(pickFirst(item, ["nome", "name", "pilar", "pillar", "titulo", "title"], "Pilar")),
    points: toNumber(pickFirst(item, ["pontos", "points", "total", "totalPontos", "total_pontos"], 0)),
  };
}

export function toSubmissionSummaryDto(item = {}) {
  return {
    id: String(pickFirst(item, ["id", "_id", "envio_desafio_id", "envioDesafioId"], "")),
    challengeTitle: String(
      pickFirst(item, ["desafio", "challenge", "titulo", "title", "challengeTitle", "desafioTitulo"], "Desafio")
    ),
    pillarName: String(pickFirst(item, ["pilar", "pillar", "pilarNome", "pillarName"], "Pilar")),
    status: String(pickFirst(item, ["status", "situacao"], "pendente")),
  };
}

export function toStudentDashboardDto(payload = {}) {
  const data = getDashboardPayload(payload);
  const pointsByPillar = pickFirst(
    data,
    ["pontuacao_por_pilar", "pontuacaoPorPilar", "points_by_pillar", "pointsByPillar"],
    []
  );
  const recentSubmissions = pickFirst(
    data,
    ["ultimos_desafios", "ultimosDesafios", "recent_submissions", "recentSubmissions"],
    []
  );

  return {
    approvedChallenges: toNumber(
      pickFirst(data, ["desafios_aprovados", "desafiosAprovados", "approvedChallenges", "aprovados"], 0)
    ),
    pendingChallenges: toNumber(
      pickFirst(data, ["desafios_pendentes", "desafiosPendentes", "pendingChallenges", "pendentes"], 0)
    ),
    pointsByPillar: Array.isArray(pointsByPillar) ? pointsByPillar.map(toPillarScoreDto) : [],
    rankingPosition: toOptionalNumber(
      pickFirst(data, ["posicao_ranking", "posicaoRanking", "rankingPosition", "ranking_position"], null)
    ),
    recentSubmissions: Array.isArray(recentSubmissions) ? recentSubmissions.map(toSubmissionSummaryDto) : [],
    totalPoints: toNumber(
      pickFirst(data, ["pontos_totais", "pontosTotais", "totalPoints", "total_points", "pontuacaoTotal"], 0)
    ),
  };
}

export function toAdminHighlightStudentDto(item = {}) {
  const aluno = pickNestedObject(item, ["aluno", "student"]);

  return {
    approvedChallenges: toNumber(
      pickFirst(item, ["desafiosAprovados", "approvedChallenges", "approved_challenges"], 0)
    ),
    id: String(pickFirst(item, ["id", "_id", "alunoId", "aluno_id", "studentId"], "") || aluno.id || aluno._id || ""),
    name: String(
      pickFirst(item, ["nome", "name", "studentName", "alunoNome"], "") ||
        getEntityName(aluno, "Aluno")
    ),
    points: toNumber(pickFirst(item, ["totalPontos", "pontos", "points", "total_points"], 0)),
    submissions: toNumber(pickFirst(item, ["envios", "submissions", "totalEnvios"], 0)),
  };
}

export function toAdminEngagementDto(payload = {}) {
  return {
    approvalRate: toNumber(pickFirst(payload, ["taxaAprovacao", "approvalRate", "approval_rate"], 0)),
    averageSubmissionsPerStudent: toNumber(
      pickFirst(payload, ["mediaEnviosPorAluno", "averageSubmissionsPerStudent"], 0)
    ),
    studentsWithSubmissions: toNumber(
      pickFirst(payload, ["alunosComEnvio", "studentsWithSubmissions"], 0)
    ),
    participationRate: toNumber(pickFirst(payload, ["taxaParticipacao", "participationRate"], 0)),
  };
}

export function toAdminDashboardDto(payload = {}) {
  const data = getDashboardPayload(payload);
  const indicators = pickNestedObject(data, ["indicadores", "indicators"]);
  const topEngagedStudents = getListPayload(data, [
    "alunosMaisEngajados",
    "mostEngagedStudents",
    "topRanking",
    "topStudents",
  ]);
  const lowParticipationStudents = getListPayload(data, [
    "baixaParticipacao",
    "alunosBaixaParticipacao",
    "lowParticipationStudents",
  ]);

  return {
    activeStudents: toNumber(
      pickFirst(indicators, ["alunosAtivos", "activeStudents", "totalActiveStudents"], 0)
    ),
    engagement: toAdminEngagementDto(
      pickFirst(data, ["engajamento", "engagement"], {})
    ),
    lowParticipationStudents: lowParticipationStudents.map(toAdminHighlightStudentDto),
    pendingApprovals: toNumber(
      pickFirst(indicators, ["aprovacoesPendentes", "enviosPendentes", "pendingApprovals"], 0)
    ),
    topEngagedStudents: topEngagedStudents.map(toAdminHighlightStudentDto),
    totalSubmissions: toNumber(
      pickFirst(indicators, ["totalEnvios", "totalSubmissions", "submissions"], 0)
    ),
  };
}

export function hasAdminDashboardData(dashboard = {}) {
  return Boolean(
    dashboard.activeStudents ||
      dashboard.totalSubmissions ||
      dashboard.pendingApprovals ||
      dashboard.topEngagedStudents?.length ||
      dashboard.lowParticipationStudents?.length
  );
}
