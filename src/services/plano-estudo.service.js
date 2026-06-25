const PlanoEstudoItem = require("../models/plano-estudo-item.model");
const User = require("../models/user.model");
const { syncCouponsForStudents } = require("./cupom.service");
const eventoAoVivoService = require("./evento-ao-vivo.service");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  normalizeText,
  omitUndefined,
  parseObjectId,
  parseOptionalText,
  parsePagination,
  parseRequiredText,
  toIsoDate,
} = require("./domain-utils");

const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const INACTIVE_STATUS = "inativo";
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKeyFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function getCurrentDateKey(referenceDate = new Date()) {
  return toDateKeyFromDate(referenceDate);
}

function normalizeDateKey(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value.trim())) {
    throw createHttpError(`${fieldName} deve estar no formato YYYY-MM-DD.`, 400);
  }
  return value.trim();
}

function addDaysToDateKey(dateKey, amount) {
  const reference = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(reference.getTime())) return null;
  reference.setUTCDate(reference.getUTCDate() + amount);
  return toDateKeyFromDate(reference);
}

function buildDefaultScoreWindowStartKey(plannedDateKey) {
  const reference = new Date(`${plannedDateKey}T00:00:00.000Z`);
  if (Number.isNaN(reference.getTime())) return plannedDateKey;
  reference.setUTCDate(reference.getUTCDate() - reference.getUTCDay());
  return toDateKeyFromDate(reference);
}

function getEffectivePlannedDateKey(item) {
  return normalizeDateKey(item && item.plannedDateKey, "plannedDateKey") || toDateKeyFromDate(item && item.startAt);
}

function getEffectiveScoreWindowStartKey(item) {
  const explicit = normalizeDateKey(item && item.scoreWindowStartKey, "scoreWindowStartKey");
  if (explicit) return explicit;
  const plannedDateKey = getEffectivePlannedDateKey(item);
  return plannedDateKey ? buildDefaultScoreWindowStartKey(plannedDateKey) : null;
}

function resolvePlannedDateKey(payload, startAt) {
  return normalizeDateKey(payload.plannedDateKey || payload.dataPlanejada, "plannedDateKey") || toDateKeyFromDate(startAt);
}

function getExplicitScoreWindowStartKey(payload) {
  return normalizeDateKey(payload.scoreWindowStartKey || payload.janelaPontuacaoInicio, "scoreWindowStartKey");
}

function doesScoreWindowContainDateKey(scoreWindowStartKey, plannedDateKey) {
  if (!scoreWindowStartKey || !plannedDateKey) return false;
  const scoreWindowEndKey = addDaysToDateKey(scoreWindowStartKey, 6);
  return scoreWindowStartKey <= plannedDateKey && scoreWindowEndKey >= plannedDateKey;
}

function resolveScoreWindowStartKey(payload, plannedDateKey, currentItem) {
  const explicit = getExplicitScoreWindowStartKey(payload);
  if (explicit) return explicit;
  if (!currentItem) return buildDefaultScoreWindowStartKey(plannedDateKey);

  const currentPlannedDateKey = getEffectivePlannedDateKey(currentItem);
  const currentScoreWindowStartKey = getEffectiveScoreWindowStartKey(currentItem);
  const currentDefaultStartKey = currentPlannedDateKey ? buildDefaultScoreWindowStartKey(currentPlannedDateKey) : null;

  if (plannedDateKey !== currentPlannedDateKey && (!currentScoreWindowStartKey || currentScoreWindowStartKey === currentDefaultStartKey)) {
    return buildDefaultScoreWindowStartKey(plannedDateKey);
  }

  return currentScoreWindowStartKey || buildDefaultScoreWindowStartKey(plannedDateKey);
}

async function findExistingScoreWindowStartKey(alunoId, plannedDateKey, itemIdToIgnore) {
  const filters = {
    aluno: alunoId,
    deletedAt: null,
    status: ACTIVE_STATUS,
  };

  if (itemIdToIgnore) {
    filters._id = { $ne: itemIdToIgnore };
  }

  const items = await PlanoEstudoItem.find(filters).sort({ startAt: 1 }).lean();
  const matchingKeys = (items || [])
    .map((item) => getEffectiveScoreWindowStartKey(item))
    .filter((scoreWindowStartKey) => doesScoreWindowContainDateKey(scoreWindowStartKey, plannedDateKey))
    .sort((left, right) => right.localeCompare(left));

  return matchingKeys[0] || null;
}

function getChecklistPointsForCompletedDays(totalCompletedDays) {
  if (totalCompletedDays <= 0) return 0;
  if (totalCompletedDays <= 3) return 1;
  if (totalCompletedDays <= 6) return 2;
  return 3;
}

function assertChecklistCompletionAllowed(plannedDateKey, completedAt) {
  if (!plannedDateKey || !completedAt) return;
  const currentDateKey = getCurrentDateKey();
  if (!currentDateKey) return;
  if (plannedDateKey > currentDateKey) {
    throw createHttpError("Só é possível concluir tarefas de hoje ou de datas anteriores.", 400);
  }
}

function buildChecklistSummary(items = []) {
  const windowsByKey = new Map();
  const completedDayKeys = new Set();
  let totalCompletedTasks = 0;

  (items || []).forEach((item) => {
    const plannedDateKey = getEffectivePlannedDateKey(item);
    const scoreWindowStartKey = getEffectiveScoreWindowStartKey(item);
    if (!plannedDateKey || !scoreWindowStartKey) return;

    const currentWindow = windowsByKey.get(scoreWindowStartKey) || {
      inicio: scoreWindowStartKey,
      fim: addDaysToDateKey(scoreWindowStartKey, 6),
      totalTarefas: 0,
      tarefasConcluidas: 0,
      dias: new Map(),
    };

    const currentDay = currentWindow.dias.get(plannedDateKey) || {
      data: plannedDateKey,
      totalTarefas: 0,
      tarefasConcluidas: 0,
      concluidoNoDia: false,
    };

    currentWindow.totalTarefas += 1;
    currentDay.totalTarefas += 1;

    if (item.completedAt) {
      currentWindow.tarefasConcluidas += 1;
      currentDay.tarefasConcluidas += 1;
      currentDay.concluidoNoDia = true;
      totalCompletedTasks += 1;
      completedDayKeys.add(plannedDateKey);
    }

    currentWindow.dias.set(plannedDateKey, currentDay);
    windowsByKey.set(scoreWindowStartKey, currentWindow);
  });

  const semanas = Array.from(windowsByKey.values())
    .map((window) => {
      const dias = Array.from(window.dias.values()).sort((left, right) => left.data.localeCompare(right.data));
      const diasComCheck = dias.filter((day) => day.concluidoNoDia).length;
      return {
        inicio: window.inicio,
        fim: window.fim,
        totalTarefas: window.totalTarefas,
        tarefasConcluidas: window.tarefasConcluidas,
        diasComCheck,
        pontos: getChecklistPointsForCompletedDays(diasComCheck),
        dias,
      };
    })
    .sort((left, right) => right.inicio.localeCompare(left.inicio));

  return {
    totalTarefas: items.length,
    tarefasConcluidas: totalCompletedTasks,
    diasComCheck: completedDayKeys.size,
    totalPontos: semanas.reduce((total, semana) => total + Number(semana.pontos || 0), 0),
    semanas,
  };
}

function buildChecklistSummaryByStudent(items = []) {
  const groupedByStudent = new Map();

  (items || []).forEach((item) => {
    const studentId = getEntityId(item && item.aluno);
    if (!studentId) return;
    const currentItems = groupedByStudent.get(studentId) || [];
    currentItems.push(item);
    groupedByStudent.set(studentId, currentItems);
  });

  return new Map(
    Array.from(groupedByStudent.entries()).map(([studentId, studentItems]) => [studentId, buildChecklistSummary(studentItems)])
  );
}

function buildPlanningStudentMap(items = []) {
  const studentsById = new Map();

  (items || []).forEach((item) => {
    const studentId = getEntityId(item && item.aluno);
    if (!studentId || !item || !item.aluno || typeof item.aluno !== "object") return;
    studentsById.set(studentId, item.aluno);
  });

  return studentsById;
}

function buildPlanningItemFilters(filters = {}) {
  const query = {
    deletedAt: null,
    status: filters.status || ACTIVE_STATUS,
  };

  if (filters.alunoId || filters.studentId) {
    query.aluno = filters.alunoId || filters.studentId;
  } else if (Array.isArray(filters.alunoIds || filters.studentIds) && (filters.alunoIds || filters.studentIds).length > 0) {
    query.aluno = { $in: filters.alunoIds || filters.studentIds };
  }

  if (filters.startDate || filters.endDate) {
    query.startAt = {};
    if (filters.startDate) query.startAt.$gte = filters.startDate;
    if (filters.endDate) query.startAt.$lte = filters.endDate;
  }

  return query;
}

async function findPlanningItemsByFilters(filters = {}) {
  let query = PlanoEstudoItem.find(buildPlanningItemFilters(filters)).sort({ startAt: 1 });
  if (filters.populateAluno) {
    query = query.populate({ path: "aluno", select: "name email role status turmas" });
  }
  return query.lean();
}

async function getChecklistSummaryFromFilters(filters = {}) {
  const items = await findPlanningItemsByFilters(filters);
  return buildChecklistSummary(items || []);
}

async function getChecklistSummaryByStudentContext(filters = {}) {
  const items = await findPlanningItemsByFilters(filters);
  return {
    items,
    summaryByStudent: buildChecklistSummaryByStudent(items || []),
    studentsById: buildPlanningStudentMap(items || []),
  };
}

function serializeItem(item) {
  const plannedDateKey = getEffectivePlannedDateKey(item);
  const scoreWindowStartKey = getEffectiveScoreWindowStartKey(item);
  return {
    id: getEntityId(item),
    title: item.title,
    titulo: item.title,
    notes: item.notes,
    observacoes: item.notes,
    startAt: toIsoDate(item.startAt),
    dataInicio: toIsoDate(item.startAt),
    endAt: toIsoDate(item.endAt),
    dataFim: toIsoDate(item.endAt),
    plannedDateKey,
    dataPlanejada: plannedDateKey,
    scoreWindowStartKey,
    janelaPontuacaoInicio: scoreWindowStartKey,
    scoreWindowEndKey: scoreWindowStartKey ? addDaysToDateKey(scoreWindowStartKey, 6) : null,
    janelaPontuacaoFim: scoreWindowStartKey ? addDaysToDateKey(scoreWindowStartKey, 6) : null,
    completed: Boolean(item.completedAt),
    concluido: Boolean(item.completedAt),
    completedAt: toIsoDate(item.completedAt),
    concluidoEm: toIsoDate(item.completedAt),
    color: item.color,
    status: item.status,
    alunoId: getEntityId(item.aluno),
    source: "pessoal",
    editable: true,
    readOnly: false,
  };
}

async function assertStudent(authenticatedUserId, message) {
  const user = await User.findById(authenticatedUserId).lean();
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (normalizeText(user.role) !== STUDENT_ROLE) throw createHttpError(message, 403);
  return user;
}

function parseDateField(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw createHttpError(`${fieldName} deve ser uma data válida.`, 400);
  return date;
}

function assertValidPeriod(startAt, endAt) {
  if (startAt && endAt && startAt > endAt) {
    throw createHttpError("dataInicio não pode ser posterior à dataFim.", 400);
  }
}

async function createItem(authenticatedUserId, payload = {}) {
  await assertStudent(authenticatedUserId, "Apenas aluno pode cadastrar itens do plano de estudo.");

  const startAt = parseDateField(payload.startAt || payload.dataInicio || payload.startDate, "dataInicio");
  if (!startAt) throw createHttpError("dataInicio é obrigatória.", 400);
  const endAt = parseDateField(payload.endAt || payload.dataFim || payload.endDate, "dataFim");
  const plannedDateKey = resolvePlannedDateKey(payload, startAt);
  const explicitScoreWindowStartKey = getExplicitScoreWindowStartKey(payload);
  const existingScoreWindowStartKey = await findExistingScoreWindowStartKey(authenticatedUserId, plannedDateKey);
  const scoreWindowStartKey = explicitScoreWindowStartKey || existingScoreWindowStartKey || buildDefaultScoreWindowStartKey(plannedDateKey);
  assertValidPeriod(startAt, endAt);

  const item = await PlanoEstudoItem.create({
    aluno: authenticatedUserId,
    title: parseRequiredText(payload.title || payload.titulo, "Título"),
    notes: parseOptionalText(payload.notes || payload.observacoes, "Observações") || null,
    startAt,
    endAt,
    plannedDateKey,
    scoreWindowStartKey,
    completedAt: null,
    color: parseOptionalText(payload.color, "Cor") || "#8502ab",
    status: ACTIVE_STATUS,
  });

  return serializeItem(item.toObject());
}

async function listItems(authenticatedUserId, query = {}) {
  await assertStudent(authenticatedUserId, "Apenas aluno pode consultar itens do plano de estudo.");

  const filters = { aluno: authenticatedUserId, deletedAt: null };
  if (query.status) filters.status = String(query.status).trim();

  const { page, limit, skip } = parsePagination(query);
  const [total, itens] = await Promise.all([
    PlanoEstudoItem.countDocuments(filters),
    PlanoEstudoItem.find(filters).sort({ startAt: 1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    total,
    pagination: buildPagination(total, page, limit),
    itens: itens.map(serializeItem),
  };
}

async function getItem(authenticatedUserId, itemId) {
  await assertStudent(authenticatedUserId, "Apenas aluno pode visualizar itens do plano de estudo.");
  const id = parseObjectId(itemId, "Item deve ser um identificador válido.");
  const item = await PlanoEstudoItem.findOne({ _id: id, aluno: authenticatedUserId, deletedAt: null }).lean();
  if (!item) throw createHttpError("Item do plano de estudo não encontrado.", 404);
  return serializeItem(item);
}

async function updateItem(authenticatedUserId, itemId, payload = {}) {
  await assertStudent(authenticatedUserId, "Apenas aluno pode editar itens do plano de estudo.");
  const id = parseObjectId(itemId, "Item deve ser um identificador válido.");
  const item = await PlanoEstudoItem.findOne({ _id: id, aluno: authenticatedUserId, deletedAt: null });
  if (!item) throw createHttpError("Item do plano de estudo não encontrado.", 404);

  const update = {};
  if (hasPayloadField(payload, ["title", "titulo"])) {
    update.title = parseRequiredText(payload.title || payload.titulo, "Título");
  }
  if (hasPayloadField(payload, ["notes", "observacoes"])) {
    update.notes = parseOptionalText(payload.notes || payload.observacoes, "Observações") || null;
  }
  if (hasPayloadField(payload, ["startAt", "dataInicio", "startDate"])) {
    update.startAt = parseDateField(payload.startAt || payload.dataInicio || payload.startDate, "dataInicio");
  }
  if (hasPayloadField(payload, ["endAt", "dataFim", "endDate"])) {
    update.endAt = parseDateField(payload.endAt || payload.dataFim || payload.endDate, "dataFim");
  }
  const nextPlannedDateKey = hasPayloadField(payload, ["plannedDateKey", "dataPlanejada"]) || update.startAt
    ? resolvePlannedDateKey(payload, update.startAt || item.startAt)
    : getEffectivePlannedDateKey(item);
  if (nextPlannedDateKey) {
    const explicitScoreWindowStartKey = getExplicitScoreWindowStartKey(payload);
    const existingScoreWindowStartKey = await findExistingScoreWindowStartKey(authenticatedUserId, nextPlannedDateKey, id);
    update.plannedDateKey = nextPlannedDateKey;
    const resolvedScoreWindowStartKey = resolveScoreWindowStartKey(payload, nextPlannedDateKey, item);
    const defaultScoreWindowStartKey = buildDefaultScoreWindowStartKey(nextPlannedDateKey);
    update.scoreWindowStartKey =
      explicitScoreWindowStartKey ||
      (resolvedScoreWindowStartKey === defaultScoreWindowStartKey ? existingScoreWindowStartKey || resolvedScoreWindowStartKey : resolvedScoreWindowStartKey);
  }
  if (hasPayloadField(payload, ["color"])) {
    update.color = parseOptionalText(payload.color, "Cor") || "#8502ab";
  }
  if (hasPayloadField(payload, ["completed", "concluido", "completedAt", "concluidoEm"])) {
    const completedFlag = payload.completed ?? payload.concluido;
    if (completedFlag === false || completedFlag === "false" || payload.completedAt === null || payload.concluidoEm === null) {
      update.completedAt = null;
    } else if (completedFlag === true || completedFlag === "true") {
      update.completedAt = new Date();
    } else {
      update.completedAt = parseDateField(payload.completedAt || payload.concluidoEm, "completedAt");
    }
  }
  if (hasPayloadField(payload, ["status"])) {
    update.status = parseRequiredText(payload.status, "Status");
  }

  assertValidPeriod(update.startAt || item.startAt, update.endAt !== undefined ? update.endAt : item.endAt);
  assertChecklistCompletionAllowed(
    update.plannedDateKey || getEffectivePlannedDateKey(item),
    Object.prototype.hasOwnProperty.call(update, "completedAt") ? update.completedAt : item.completedAt
  );

  await PlanoEstudoItem.updateOne({ _id: id }, omitUndefined(update));
  const updated = await PlanoEstudoItem.findById(id).lean();
  await syncCouponsForStudents([authenticatedUserId], { occurredAt: updated && (updated.completedAt || updated.updatedAt || new Date()) });
  return serializeItem(updated);
}

async function deleteItem(authenticatedUserId, itemId) {
  await assertStudent(authenticatedUserId, "Apenas aluno pode excluir itens do plano de estudo.");
  const id = parseObjectId(itemId, "Item deve ser um identificador válido.");
  const item = await PlanoEstudoItem.findOne({ _id: id, aluno: authenticatedUserId, deletedAt: null });
  if (!item) throw createHttpError("Item do plano de estudo não encontrado.", 404);

  await PlanoEstudoItem.updateOne({ _id: id }, { status: INACTIVE_STATUS, deletedAt: new Date() });
  const updated = await PlanoEstudoItem.findById(id).lean();
  await syncCouponsForStudents([authenticatedUserId], { occurredAt: new Date() });
  return serializeItem(updated);
}

function hasPayloadField(payload, fields) {
  return fields.some((field) => Object.prototype.hasOwnProperty.call(payload || {}, field));
}

async function getAgenda(authenticatedUserId, query = {}) {
  await assertStudent(authenticatedUserId, "Apenas aluno pode consultar a agenda do plano de estudo.");

  const [eventos, itensResult] = await Promise.all([
    eventoAoVivoService.listEventosForAgenda(authenticatedUserId, query),
    listItems(authenticatedUserId, { ...query, limit: query.limit || 500, page: 1 }),
  ]);

  const agenda = [...eventos, ...itensResult.itens].sort((left, right) => {
    return new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
  });

  return {
    total: agenda.length,
    eventosMentoria: eventos.length,
    itensPessoais: itensResult.itens.length,
    agenda,
  };
}

module.exports = {
  buildPlanningStudentMap,
  buildChecklistSummary,
  buildChecklistSummaryByStudent,
  createItem,
  deleteItem,
  findPlanningItemsByFilters,
  getAgenda,
  getChecklistPointsForCompletedDays,
  getChecklistSummaryByStudentContext,
  getChecklistSummaryFromFilters,
  getItem,
  listItems,
  serializeItem,
  updateItem,
};
