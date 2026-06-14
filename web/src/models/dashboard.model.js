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
