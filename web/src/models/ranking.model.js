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

function getRankingPayload(payload = {}) {
  return payload.data || payload.rankingGeral || payload.generalRanking || payload;
}

function getRankingListPayload(payload = {}) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const data = getRankingPayload(payload);

  if (Array.isArray(data)) {
    return data;
  }

  const foundKey = ["ranking", "items", "classificacao", "entries", "results"].find((key) =>
    Array.isArray(data[key])
  );

  return foundKey ? data[foundKey] : [];
}

function pickNestedObject(source = {}, keys = []) {
  const foundKey = keys.find((key) => {
    const value = source[key];

    return value && typeof value === "object";
  });

  return foundKey ? source[foundKey] : {};
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

  return toText(entity.name || entity.nome || entity.fullName || entity.nomeCompleto, fallback);
}

function getEntityEmail(entity) {
  if (!entity || typeof entity !== "object") {
    return "";
  }

  return toText(entity.email);
}

function normalizeIdentifier(value = "") {
  return toText(value).toLowerCase();
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "sim", "1"].includes(value.trim().toLowerCase());
  }

  return fallback;
}

function getAllowedFlag(data = {}) {
  const value = pickFirst(data, ["permitido", "allowed", "isAllowed", "rankingPermitido"], true);

  return value !== false;
}

export function toRankingEntryDto(item = {}) {
  const aluno = pickNestedObject(item, ["aluno", "student", "user", "usuario"]);

  return {
    approvedChallenges: toNumber(
      pickFirst(item, ["desafiosAprovados", "approvedChallenges", "approved_challenges"], 0)
    ),
    id: toText(pickFirst(item, ["id", "_id", "alunoId", "aluno_id", "studentId"], "") || getEntityId(aluno)),
    isCurrentUser: toBoolean(pickFirst(item, ["isCurrentUser", "atual", "me", "currentUser"], false)),
    position: toNumber(pickFirst(item, ["posicao", "position", "rank", "rankingPosition"], 0)),
    points: toNumber(pickFirst(item, ["totalPontos", "pontos", "points", "total_points", "score"], 0)),
    studentEmail: toText(pickFirst(item, ["email", "studentEmail", "alunoEmail"], "") || getEntityEmail(aluno)),
    studentName: toText(
      pickFirst(item, ["nome", "name", "studentName", "alunoNome"], "") || getEntityName(aluno, "Aluno")
    ),
  };
}

export function toRankingDto(payload = {}) {
  const data = getRankingPayload(payload);
  const entries = getRankingListPayload(data).map(toRankingEntryDto);

  return {
    entries,
    filters: pickFirst(data, ["filtros", "filters"], {}),
    isAllowed: getAllowedFlag(data),
    totalParticipants: toNumber(
      pickFirst(data, ["totalParticipantes", "totalParticipants", "total", "count"], entries.length)
    ),
    unavailableMessage: toText(
      pickFirst(
        data,
        ["mensagem", "message", "unavailableMessage"],
        "Ranking indisponivel para alunos no momento."
      )
    ),
  };
}

export function isCurrentRankingEntry(entry = {}, currentUser = {}) {
  if (entry.isCurrentUser) {
    return true;
  }

  const currentUserId = normalizeIdentifier(currentUser.id || currentUser._id);
  const currentUserEmail = normalizeIdentifier(currentUser.email);

  return Boolean(
    (currentUserId && normalizeIdentifier(entry.id) === currentUserId) ||
      (currentUserEmail && normalizeIdentifier(entry.studentEmail) === currentUserEmail)
  );
}
