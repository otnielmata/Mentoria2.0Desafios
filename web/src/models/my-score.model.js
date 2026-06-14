function pickFirst(source = {}, keys = [], fallback = undefined) {
  const foundKey = keys.find((key) => source[key] !== undefined && source[key] !== null);

  return foundKey ? source[foundKey] : fallback;
}

function toText(value, fallback = "") {
  return String(value ?? fallback).trim();
}

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getNestedObject(source, key) {
  const nested = source?.[key];

  return nested && typeof nested === "object" ? nested : {};
}

function pickNestedObject(source, keys = []) {
  const foundKey = keys.find((key) => {
    const value = source?.[key];

    return value && typeof value === "object";
  });

  return foundKey ? source[foundKey] : {};
}

function pickScalarValue(source, keys = []) {
  const foundKey = keys.find((key) => {
    const value = source?.[key];

    return value !== undefined && value !== null && typeof value !== "object";
  });

  return foundKey ? source[foundKey] : "";
}

function getEntityId(entity, fallback = "") {
  if (!entity || typeof entity !== "object") {
    return toText(entity, fallback);
  }

  return toText(entity.id || entity._id, fallback);
}

function getEntityName(entity, fallback = "") {
  if (!entity || typeof entity !== "object") {
    return toText(entity, fallback);
  }

  return toText(entity.name || entity.nome || entity.title || entity.titulo, fallback);
}

function normalizeName(value = "") {
  return toText(value).toLowerCase();
}

function getScorePayload(payload = {}) {
  return payload.pontuacao || payload.score || payload.data || payload;
}

function getListPayload(source = {}, keys = []) {
  if (Array.isArray(source)) {
    return source;
  }

  const foundKey = keys.find((key) => Array.isArray(source[key]));

  return foundKey ? source[foundKey] : [];
}

export const methodPillarNames = Object.freeze([
  "Conhecimento Tecnico Alinhado ao Mercado",
  "Posicionamento e Softskills",
  "Pratica",
  "Exposicao a Problemas",
  "Compartilhamento",
  "Networking",
  "Visibilidade",
]);

export function toPillarScoreItemDto(item = {}) {
  const pilar = pickNestedObject(item, ["pilar", "pillar"]);
  const name = toText(
    pickFirst(item, ["pilarNome", "pillarName", "nome", "name"], "") ||
      pickScalarValue(item, ["pilar", "pillar"]) ||
      getEntityName(pilar, "Pilar")
  );

  return {
    approvedChallenges: toNumber(
      pickFirst(item, ["desafiosAprovados", "approvedChallenges", "approved_challenges"], 0)
    ),
    id: toText(pickFirst(item, ["id", "_id", "pilarId", "pilar_id"], "") || getEntityId(pilar, name)),
    name,
    points: toNumber(pickFirst(item, ["pontos", "points", "total", "totalPontos", "total_points"], 0)),
  };
}

export function completeMethodPillarScores(items = []) {
  const normalizedItems = items.map(toPillarScoreItemDto);
  const itemsByName = new Map(normalizedItems.map((item) => [normalizeName(item.name), item]));
  const methodScores = methodPillarNames.map((name) => {
    const found = itemsByName.get(normalizeName(name));

    return found || { approvedChallenges: 0, id: name, name, points: 0 };
  });
  const extraScores = normalizedItems.filter(
    (item) => !methodPillarNames.some((name) => normalizeName(name) === normalizeName(item.name))
  );

  return [...methodScores, ...extraScores];
}

export function toScoreHistoryItemDto(item = {}) {
  const desafio = pickNestedObject(item, ["desafio", "challenge"]);
  const envio = pickNestedObject(item, ["envio", "submission"]);
  const directPilar = pickNestedObject(item, ["pilar", "pillar"]);
  const pilar = Object.keys(directPilar).length ? directPilar : getNestedObject(desafio, "pilar");
  const challengeTitle = toText(
    pickFirst(item, ["desafioTitulo", "challengeTitle", "titulo", "title"], "") ||
      pickScalarValue(item, ["desafio", "challenge"]) ||
      getEntityName(desafio, "Desafio")
  );

  return {
    approvedAt: toText(pickFirst(item, ["approvedAt", "aprovadoEm", "aprovado_em"], "")),
    challengeTitle,
    createdAt: toText(pickFirst(item, ["createdAt", "created_at", "data"], "")),
    id: toText(pickFirst(item, ["id", "_id", "pontuacaoId", "pontuacao_id"], "")),
    pillarName: toText(
      pickFirst(item, ["pilarNome", "pillarName"], "") ||
        pickScalarValue(item, ["pilar", "pillar"]) ||
        getEntityName(pilar, "Pilar")
    ),
    points: toNumber(pickFirst(item, ["pontos", "points"], 0)),
    reason: toText(pickFirst(item, ["motivo", "reason", "description", "descricao"], "") || challengeTitle),
    submissionId: toText(
      pickFirst(item, ["envioId", "envio_id", "envioDesafioId", "envio_desafio_id"], "") ||
        pickScalarValue(item, ["envio", "submission"]) ||
        getEntityId(envio, "")
    ),
  };
}

export function toMyScoreDto(payload = {}) {
  const data = getScorePayload(payload);
  const pointsByPillar = getListPayload(data, [
    "pontosPorPilar",
    "pontuacaoPorPilar",
    "pontuacao_por_pilar",
    "pointsByPillar",
    "points_by_pillar",
  ]);
  const history = getListPayload(data, ["historico", "history", "pontuacoes", "items"]);

  return {
    approvedChallenges: toNumber(
      pickFirst(data, ["desafiosAprovados", "approvedChallenges", "approved_challenges"], 0)
    ),
    filters: pickFirst(data, ["filtros", "filters"], {}),
    history: history.map(toScoreHistoryItemDto),
    pointsByPillar: completeMethodPillarScores(pointsByPillar),
    totalPoints: toNumber(
      pickFirst(data, ["totalPontos", "pontosTotais", "pontuacaoTotal", "totalPoints", "total_points"], 0)
    ),
  };
}

export function hasApprovedScore(score = {}) {
  return (
    toNumber(score.totalPoints, 0) > 0 ||
    toNumber(score.approvedChallenges, 0) > 0 ||
    (Array.isArray(score.history) && score.history.length > 0) ||
    (Array.isArray(score.pointsByPillar) && score.pointsByPillar.some((item) => toNumber(item.points, 0) > 0))
  );
}
