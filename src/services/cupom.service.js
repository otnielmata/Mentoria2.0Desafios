const Cupom = require("../models/cupom.model");
const PlanoEstudoItem = require("../models/plano-estudo-item.model");
const Pontuacao = require("../models/pontuacao.model");
const User = require("../models/user.model");
const {
  buildPagination,
  createHttpError,
  getEntityId,
  normalizeText,
  omitUndefined,
  parseOptionalText,
  parsePagination,
  toIsoDate,
} = require("./domain-utils");

const ACTIVE_COUPON_STATUSES = ["pendente", "validado"];
const ADMIN_ROLES = ["professor", "admin"];
const CANCELED_STATUS = "cancelado";
const PENDING_STATUS = "pendente";
const VALIDATED_STATUS = "validado";
const STUDENT_ROLE = "aluno";
const ACTIVE_STATUS = "ativo";
const POINTS_PER_COUPON = 10;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function hasLuckyNumber(coupon) {
  const luckyNumber = Number(coupon && coupon.luckyNumber);
  return Number.isInteger(luckyNumber) && luckyNumber > 0;
}

function sortValidatedCouponsForLuckyNumber(left, right) {
  const leftValidatedAt = left && left.validatedAt ? new Date(left.validatedAt).getTime() : Number.POSITIVE_INFINITY;
  const rightValidatedAt = right && right.validatedAt ? new Date(right.validatedAt).getTime() : Number.POSITIVE_INFINITY;
  if (leftValidatedAt !== rightValidatedAt) return leftValidatedAt - rightValidatedAt;

  const leftConqueredAt = left && left.conqueredAt ? new Date(left.conqueredAt).getTime() : Number.POSITIVE_INFINITY;
  const rightConqueredAt = right && right.conqueredAt ? new Date(right.conqueredAt).getTime() : Number.POSITIVE_INFINITY;
  if (leftConqueredAt !== rightConqueredAt) return leftConqueredAt - rightConqueredAt;

  const leftAlunoId = String(getEntityId(left && left.aluno) || "");
  const rightAlunoId = String(getEntityId(right && right.aluno) || "");
  const alunoOrder = leftAlunoId.localeCompare(rightAlunoId, "pt-BR");
  if (alunoOrder !== 0) return alunoOrder;

  const leftOrdinal = Number(left && left.ordinal) || 0;
  const rightOrdinal = Number(right && right.ordinal) || 0;
  if (leftOrdinal !== rightOrdinal) return leftOrdinal - rightOrdinal;

  return String(getEntityId(left) || "").localeCompare(String(getEntityId(right) || ""), "pt-BR");
}

function sortLuckyNumberCouponsByDate(left, right) {
  return sortValidatedCouponsForLuckyNumber(left, right);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toDateKeyFromDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function normalizeDateKey(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string" && DATE_KEY_PATTERN.test(value.trim())) return value.trim();
  return null;
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
  return normalizeDateKey(item && item.plannedDateKey) || normalizeDateKey(item && item.dataPlanejada) || toDateKeyFromDate(item && (item.startAt || item.dataInicio));
}

function getEffectiveScoreWindowStartKey(item) {
  const explicit = normalizeDateKey(item && item.scoreWindowStartKey) || normalizeDateKey(item && item.janelaPontuacaoInicio);
  if (explicit) return explicit;
  const plannedDateKey = getEffectivePlannedDateKey(item);
  return plannedDateKey ? buildDefaultScoreWindowStartKey(plannedDateKey) : null;
}

function getChecklistPointsForCompletedDays(totalCompletedDays) {
  if (totalCompletedDays <= 0) return 0;
  if (totalCompletedDays <= 3) return 1;
  if (totalCompletedDays <= 6) return 2;
  return 3;
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

  const semanas = Array.from(windowsByKey.values()).map((window) => {
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
  });

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

  return new Map(Array.from(groupedByStudent.entries()).map(([studentId, studentItems]) => [studentId, buildChecklistSummary(studentItems)]));
}

function emptyCouponSummary() {
  return {
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
  };
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

function serializeDesafio(desafio) {
  if (!desafio) return null;
  if (typeof desafio !== "object") return { id: getEntityId(desafio) };

  return omitUndefined({
    id: getEntityId(desafio),
    title: desafio.title,
    description: desafio.description,
    status: desafio.status,
  });
}

function serializeCupom(cupom) {
  const status = normalizeText(cupom && cupom.status) || PENDING_STATUS;
  const luckyNumber = hasLuckyNumber(cupom) ? Number(cupom.luckyNumber) : null;
  return {
    id: getEntityId(cupom),
    ordinal: Number(cupom.ordinal || 0),
    numero: Number(cupom.ordinal || 0),
    milestonePoints: Number(cupom.milestonePoints || 0),
    pontosMarco: Number(cupom.milestonePoints || 0),
    status,
    conqueredAt: toIsoDate(cupom.conqueredAt),
    conquistadoEm: toIsoDate(cupom.conqueredAt),
    validatedAt: toIsoDate(cupom.validatedAt),
    validadoEm: toIsoDate(cupom.validatedAt),
    luckyNumber,
    numeroSorte: luckyNumber,
    luckyNumberAssignedAt: toIsoDate(cupom.luckyNumberAssignedAt),
    numeroSorteDistribuidoEm: toIsoDate(cupom.luckyNumberAssignedAt),
    pending: status === PENDING_STATUS,
    pendente: status === PENDING_STATUS,
    validated: status === VALIDATED_STATUS,
    validado: status === VALIDATED_STATUS,
    hasLuckyNumber: luckyNumber !== null,
    temNumeroSorte: luckyNumber !== null,
    validationChallenge: serializeDesafio(cupom.validatedByDesafio),
    desafioValidacao: serializeDesafio(cupom.validatedByDesafio),
    validatedByEnvioId: getEntityId(cupom.validatedByEnvio),
    validadoPorEnvioId: getEntityId(cupom.validatedByEnvio),
  };
}

function serializeLuckyNumberCoupon(cupom) {
  const serialized = serializeCupom(cupom);
  return {
    ...serialized,
    aluno: serializeAluno(cupom && cupom.aluno),
    distribuido: serialized.temNumeroSorte,
    aguardandoDistribuicao: serialized.validado && !serialized.temNumeroSorte,
  };
}

function buildCouponSummary(coupons = []) {
  const activeCoupons = (coupons || [])
    .filter((coupon) => ACTIVE_COUPON_STATUSES.includes(normalizeText(coupon.status)))
    .sort((left, right) => Number(right.ordinal || 0) - Number(left.ordinal || 0));
  const itens = activeCoupons.map(serializeCupom);
  const cuponsValidados = itens.filter((item) => item.validado).length;
  const cuponsPendentes = itens.filter((item) => item.pendente).length;
  const cuponsComNumeroSorte = itens.filter((item) => item.validado && item.temNumeroSorte).length;
  const cuponsAguardandoNumeroSorte = itens.filter((item) => item.validado && !item.temNumeroSorte).length;
  const numerosDaSorte = itens
    .filter((item) => item.temNumeroSorte)
    .map((item) => Number(item.numeroSorte))
    .filter((value) => Number.isInteger(value) && value > 0)
    .sort((left, right) => left - right);

  return {
    totalCupons: itens.length,
    cuponsValidados,
    cuponsPendentes,
    cuponsComNumeroSorte,
    cuponsAguardandoNumeroSorte,
    ultimoConquistadoEm: itens.reduce((latest, item) => {
      if (!item.conquistadoEm) return latest;
      if (!latest) return item.conquistadoEm;
      return new Date(item.conquistadoEm).getTime() > new Date(latest).getTime() ? item.conquistadoEm : latest;
    }, null),
    ultimaValidacaoEm: itens.reduce((latest, item) => {
      if (!item.validadoEm) return latest;
      if (!latest) return item.validadoEm;
      return new Date(item.validadoEm).getTime() > new Date(latest).getTime() ? item.validadoEm : latest;
    }, null),
    ultimoNumeroSorteDistribuidoEm: itens.reduce((latest, item) => {
      if (!item.numeroSorteDistribuidoEm) return latest;
      if (!latest) return item.numeroSorteDistribuidoEm;
      return new Date(item.numeroSorteDistribuidoEm).getTime() > new Date(latest).getTime() ? item.numeroSorteDistribuidoEm : latest;
    }, null),
    numerosDaSorte,
    itens,
  };
}

function buildStudentFilters(query = {}) {
  const filters = { role: STUDENT_ROLE };
  const search = parseOptionalText(query.search || query.q || query.nome, "Busca");
  const status = parseOptionalText(query.status, "Status");

  if (status) {
    filters.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filters.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  return filters;
}

function buildCouponSummaryByStudent(coupons = [], studentIds = []) {
  const groupedByStudent = new Map();

  (studentIds || []).forEach((studentId) => {
    groupedByStudent.set(getEntityId(studentId), []);
  });

  (coupons || []).forEach((coupon) => {
    const studentId = getEntityId(coupon && coupon.aluno);
    if (!studentId) return;
    const currentCoupons = groupedByStudent.get(studentId) || [];
    currentCoupons.push(coupon);
    groupedByStudent.set(studentId, currentCoupons);
  });

  return new Map(Array.from(groupedByStudent.entries()).map(([studentId, studentCoupons]) => [studentId, buildCouponSummary(studentCoupons)]));
}

async function getStudentIdsFromUsers(filters = {}) {
  const query = { role: STUDENT_ROLE };
  if (filters.status) query.status = filters.status;
  const students = await User.find(query).select("_id").lean();
  return (students || []).map((student) => getEntityId(student)).filter(Boolean);
}

async function buildTotalPointsByStudentIds(studentIds = []) {
  const uniqueStudentIds = [...new Set((studentIds || []).map(getEntityId).filter(Boolean))];
  if (uniqueStudentIds.length === 0) return new Map();

  const [pontuacoes, planningItems] = await Promise.all([
    Pontuacao.find({ aluno: { $in: uniqueStudentIds } }).select("aluno pontos").lean(),
    PlanoEstudoItem.find({ aluno: { $in: uniqueStudentIds }, deletedAt: null, status: ACTIVE_STATUS })
      .select("aluno plannedDateKey scoreWindowStartKey startAt completedAt")
      .lean(),
  ]);

  const totalsByStudent = new Map(uniqueStudentIds.map((studentId) => [studentId, 0]));

  (pontuacoes || []).forEach((pontuacao) => {
    const studentId = getEntityId(pontuacao && pontuacao.aluno);
    if (!studentId) return;
    totalsByStudent.set(studentId, Number(totalsByStudent.get(studentId) || 0) + Number(pontuacao.pontos || 0));
  });

  const checklistSummaryByStudent = buildChecklistSummaryByStudent(planningItems || []);
  uniqueStudentIds.forEach((studentId) => {
    const checklistPoints = Number((checklistSummaryByStudent.get(studentId) || {}).totalPontos || 0);
    totalsByStudent.set(studentId, Number(totalsByStudent.get(studentId) || 0) + checklistPoints);
  });

  return totalsByStudent;
}

function normalizeOccurrenceDate(value) {
  if (!value) return new Date();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function syncCouponsForStudents(studentIds = [], options = {}) {
  const uniqueStudentIds = [...new Set((studentIds || []).map(getEntityId).filter(Boolean))];
  if (uniqueStudentIds.length === 0) return new Map();

  const occurredAt = normalizeOccurrenceDate(options.occurredAt);
  const [totalsByStudent, existingCoupons] = await Promise.all([
    buildTotalPointsByStudentIds(uniqueStudentIds),
    Cupom.find({ aluno: { $in: uniqueStudentIds } }).sort({ ordinal: 1 }).lean(),
  ]);
  const couponsByStudent = new Map();

  (existingCoupons || []).forEach((coupon) => {
    const studentId = getEntityId(coupon && coupon.aluno);
    if (!studentId) return;
    const currentCoupons = couponsByStudent.get(studentId) || [];
    currentCoupons.push(coupon);
    couponsByStudent.set(studentId, currentCoupons);
  });

  for (const studentId of uniqueStudentIds) {
    const totalPoints = Number(totalsByStudent.get(studentId) || 0);
    const desiredCount = Math.max(Math.floor(totalPoints / POINTS_PER_COUPON), 0);
    const studentCoupons = couponsByStudent.get(studentId) || [];
    const couponsByOrdinal = new Map(studentCoupons.map((coupon) => [Number(coupon.ordinal || 0), coupon]));

    for (let ordinal = 1; ordinal <= desiredCount; ordinal += 1) {
      const existingCoupon = couponsByOrdinal.get(ordinal);
      if (!existingCoupon) {
        await Cupom.create({
          aluno: studentId,
          ordinal,
          milestonePoints: ordinal * POINTS_PER_COUPON,
          status: PENDING_STATUS,
          conqueredAt: occurredAt,
          validatedAt: null,
          validatedByDesafio: null,
          validatedByEnvio: null,
          luckyNumber: null,
          luckyNumberAssignedAt: null,
          canceledAt: null,
        });
        continue;
      }

      if (normalizeText(existingCoupon.status) === CANCELED_STATUS) {
        await Cupom.updateOne(
          { _id: existingCoupon._id },
          {
            $set: {
              milestonePoints: ordinal * POINTS_PER_COUPON,
              status: PENDING_STATUS,
              conqueredAt: occurredAt,
              validatedAt: null,
              validatedByDesafio: null,
              validatedByEnvio: null,
              luckyNumber: null,
              luckyNumberAssignedAt: null,
              canceledAt: null,
            },
          }
        );
      }
    }

    for (const coupon of studentCoupons) {
      if (Number(coupon.ordinal || 0) <= desiredCount || normalizeText(coupon.status) === CANCELED_STATUS) continue;
      await Cupom.updateOne(
        { _id: coupon._id },
        {
          $set: {
            status: CANCELED_STATUS,
            canceledAt: occurredAt,
            validatedAt: null,
            validatedByDesafio: null,
            validatedByEnvio: null,
            luckyNumber: null,
            luckyNumberAssignedAt: null,
          },
        }
      );
    }
  }

  return getCouponSummaryByStudentIds(uniqueStudentIds, { sync: false, populateValidationSource: Boolean(options.populateValidationSource) });
}

async function getCouponSummaryByStudentIds(studentIds = [], options = {}) {
  const uniqueStudentIds = [...new Set((studentIds || []).map(getEntityId).filter(Boolean))];
  if (uniqueStudentIds.length === 0) return new Map();

  if (options.sync) {
    await syncCouponsForStudents(uniqueStudentIds, { occurredAt: options.occurredAt });
  }

  let query = Cupom.find({
    aluno: { $in: uniqueStudentIds },
    status: { $in: ACTIVE_COUPON_STATUSES },
  }).sort({ ordinal: -1 });

  if (options.populateValidationSource) {
    query = query.populate({ path: "validatedByDesafio", select: "title description status" });
  }

  const coupons = await query.lean();
  const summaries = buildCouponSummaryByStudent(coupons || [], uniqueStudentIds);
  uniqueStudentIds.forEach((studentId) => {
    if (!summaries.has(studentId)) summaries.set(studentId, emptyCouponSummary());
  });
  return summaries;
}

async function getStudentCouponSummary(studentId, options = {}) {
  const summaries = await getCouponSummaryByStudentIds([studentId], options);
  return summaries.get(getEntityId(studentId)) || emptyCouponSummary();
}

async function validatePendingCouponsForStudents(studentIds = [], options = {}) {
  const uniqueStudentIds = [...new Set((studentIds || []).map(getEntityId).filter(Boolean))];
  if (uniqueStudentIds.length === 0) return new Map();

  const validatedAt = normalizeOccurrenceDate(options.validatedAt || options.occurredAt);
  await Cupom.updateMany(
    { aluno: { $in: uniqueStudentIds }, status: PENDING_STATUS },
    {
      $set: {
        status: VALIDATED_STATUS,
        validatedAt,
        validatedByDesafio: options.desafioId || null,
        validatedByEnvio: options.envioId || null,
        luckyNumber: null,
        luckyNumberAssignedAt: null,
        canceledAt: null,
      },
    }
  );

  return getCouponSummaryByStudentIds(uniqueStudentIds, { sync: false, populateValidationSource: Boolean(options.populateValidationSource) });
}

async function distributeLuckyNumbers(authenticatedUserId) {
  await assertAdmin(authenticatedUserId);

  const distributedAt = new Date();
  const validatedCoupons = await Cupom.find({
    status: VALIDATED_STATUS,
  })
    .sort({ validatedAt: 1, conqueredAt: 1, createdAt: 1, _id: 1 })
    .lean();
  const sortedCoupons = (validatedCoupons || []).slice().sort(sortValidatedCouponsForLuckyNumber);
  const alreadyDistributedCoupons = sortedCoupons.filter((coupon) => hasLuckyNumber(coupon));
  const pendingCoupons = sortedCoupons.filter((coupon) => !hasLuckyNumber(coupon));
  let nextLuckyNumber = alreadyDistributedCoupons.reduce((highest, coupon) => Math.max(highest, Number(coupon.luckyNumber || 0)), 0);

  for (const coupon of pendingCoupons) {
    nextLuckyNumber += 1;
    await Cupom.updateOne(
      { _id: coupon._id },
      {
        $set: {
          luckyNumber: nextLuckyNumber,
          luckyNumberAssignedAt: distributedAt,
        },
      }
    );
  }

  const studentIds = [...new Set(sortedCoupons.map((coupon) => getEntityId(coupon && coupon.aluno)).filter(Boolean))];
  const summaries = await getCouponSummaryByStudentIds(studentIds, { sync: false, populateValidationSource: false });
  const luckyNumberCoupons = await Cupom.find({
    status: VALIDATED_STATUS,
    aluno: { $in: studentIds },
  })
    .populate({ path: "aluno", select: "name email role status" })
    .sort({ validatedAt: 1, conqueredAt: 1, luckyNumber: 1, _id: 1 })
    .lean();
  const serializedLuckyNumberCoupons = (luckyNumberCoupons || []).slice().sort(sortLuckyNumberCouponsByDate).map(serializeLuckyNumberCoupon);
  const latestDistributionDate = serializedLuckyNumberCoupons.reduce((latest, coupon) => {
    if (!coupon.numeroSorteDistribuidoEm) return latest;
    if (!latest) return coupon.numeroSorteDistribuidoEm;
    return new Date(coupon.numeroSorteDistribuidoEm).getTime() > new Date(latest).getTime() ? coupon.numeroSorteDistribuidoEm : latest;
  }, null);

  return {
    resumo: {
      totalCuponsValidados: sortedCoupons.length,
      numerosDistribuidos: pendingCoupons.length,
      numerosJaDistribuidos: alreadyDistributedCoupons.length,
      totalNumerosDistribuidos: alreadyDistributedCoupons.length + pendingCoupons.length,
      alunosContemplados: studentIds.length,
      ultimaDistribuicaoEm: pendingCoupons.length > 0 ? distributedAt.toISOString() : latestDistributionDate,
    },
    cupons: serializedLuckyNumberCoupons,
    alunos: studentIds.map((studentId) => ({
      alunoId: studentId,
      cupons: summaries.get(studentId) || emptyCouponSummary(),
    })),
  };
}

async function getCouponOverview(options = {}) {
  const studentIds = options.studentIds
    ? [...new Set((options.studentIds || []).map(getEntityId).filter(Boolean))]
    : await getStudentIdsFromUsers({ status: options.studentStatus });

  if (options.sync) {
    await syncCouponsForStudents(studentIds, { occurredAt: options.occurredAt });
  }

  const coupons = await Cupom.find({
    aluno: { $in: studentIds },
    status: { $in: ACTIVE_COUPON_STATUSES },
  }).lean();

  const summary = buildCouponSummary(coupons || []);
  return {
    totalCupons: summary.totalCupons,
    cuponsValidados: summary.cuponsValidados,
    cuponsPendentes: summary.cuponsPendentes,
    cuponsComNumeroSorte: summary.cuponsComNumeroSorte,
    cuponsAguardandoNumeroSorte: summary.cuponsAguardandoNumeroSorte,
    ultimoNumeroSorteDistribuidoEm: summary.ultimoNumeroSorteDistribuidoEm,
  };
}

async function assertAdmin(authenticatedUserId) {
  const user = await User.findById(authenticatedUserId);
  if (!user) throw createHttpError("Usuário autenticado não encontrado.", 404);
  if (!ADMIN_ROLES.includes(normalizeText(user.role))) {
    throw createHttpError("Apenas professor ou admin pode consultar cupons.", 403);
  }
  return user;
}

async function listStudentCoupons(authenticatedUserId, query = {}) {
  await assertAdmin(authenticatedUserId);
  const filters = buildStudentFilters(query);

  const { page, limit, skip } = parsePagination(query);
  const [total, students] = await Promise.all([
    User.countDocuments(filters),
    User.find(filters).sort({ name: 1 }).skip(skip).limit(limit).lean(),
  ]);
  const studentIds = (students || []).map((student) => getEntityId(student)).filter(Boolean);
  const summaries = await getCouponSummaryByStudentIds(studentIds, { sync: true });

  return {
    total,
    pagination: buildPagination(total, page, limit),
    alunos: (students || []).map((student) => {
      const summary = summaries.get(getEntityId(student)) || emptyCouponSummary();
      return {
        aluno: serializeAluno(student),
        cupons: summary,
        totalCupons: summary.totalCupons,
        cuponsValidados: summary.cuponsValidados,
        cuponsPendentes: summary.cuponsPendentes,
        cuponsComNumeroSorte: summary.cuponsComNumeroSorte,
        cuponsAguardandoNumeroSorte: summary.cuponsAguardandoNumeroSorte,
        numerosDaSorte: summary.numerosDaSorte,
        ultimoConquistadoEm: summary.ultimoConquistadoEm,
        ultimaValidacaoEm: summary.ultimaValidacaoEm,
        ultimoNumeroSorteDistribuidoEm: summary.ultimoNumeroSorteDistribuidoEm,
      };
    }),
  };
}

async function listStudentLuckyNumbers(authenticatedUserId, query = {}) {
  await assertAdmin(authenticatedUserId);

  const filters = buildStudentFilters(query);
  const { page, limit, skip } = parsePagination(query);
  const [total, students] = await Promise.all([
    User.countDocuments(filters),
    User.find(filters).sort({ name: 1 }).skip(skip).limit(limit).lean(),
  ]);
  const studentIds = (students || []).map((student) => getEntityId(student)).filter(Boolean);
  const summaries = await getCouponSummaryByStudentIds(studentIds, { sync: true });

  return {
    total,
    pagination: buildPagination(total, page, limit),
    alunos: (students || []).map((student) => {
      const summary = summaries.get(getEntityId(student)) || emptyCouponSummary();
      return {
        aluno: serializeAluno(student),
        totalCuponsValidados: summary.cuponsValidados,
        totalNumerosSorte: summary.cuponsComNumeroSorte,
        cuponsAguardandoNumeroSorte: summary.cuponsAguardandoNumeroSorte,
        numerosDaSorte: summary.numerosDaSorte,
        ultimaDistribuicaoEm: summary.ultimoNumeroSorteDistribuidoEm,
        cupons: summary,
      };
    }),
  };
}

async function listLuckyNumberCoupons(authenticatedUserId, query = {}) {
  await assertAdmin(authenticatedUserId);

  const filters = buildStudentFilters(query);
  const students = await User.find(filters).select("name email role status").lean();
  const studentsById = new Map((students || []).map((student) => [getEntityId(student), student]));
  const studentIds = Array.from(studentsById.keys());
  if (studentIds.length === 0) {
    const { page, limit } = parsePagination(query);
    return {
      total: 0,
      pagination: buildPagination(0, page, limit),
      resumo: {
        totalCuponsValidados: 0,
        cuponsDistribuidos: 0,
        cuponsAguardandoDistribuicao: 0,
      },
      cupons: [],
    };
  }

  const validatedCoupons = await Cupom.find({
    aluno: { $in: studentIds },
    status: VALIDATED_STATUS,
  })
    .sort({ validatedAt: 1, conqueredAt: 1, luckyNumber: 1, _id: 1 })
    .lean();
  const rows = (validatedCoupons || [])
    .map((coupon) => ({
      ...coupon,
      aluno: studentsById.get(getEntityId(coupon && coupon.aluno)) || coupon.aluno,
    }))
    .sort(sortLuckyNumberCouponsByDate)
    .map(serializeLuckyNumberCoupon);
  const { page, limit, skip } = parsePagination(query);
  const paginatedRows = rows.slice(skip, skip + limit);

  return {
    total: rows.length,
    pagination: buildPagination(rows.length, page, limit),
    resumo: {
      totalCuponsValidados: rows.length,
      cuponsDistribuidos: rows.filter((row) => row.distribuido).length,
      cuponsAguardandoDistribuicao: rows.filter((row) => row.aguardandoDistribuicao).length,
    },
    cupons: paginatedRows,
  };
}

module.exports = {
  ACTIVE_COUPON_STATUSES,
  CANCELED_STATUS,
  PENDING_STATUS,
  POINTS_PER_COUPON,
  VALIDATED_STATUS,
  buildChecklistSummary,
  buildChecklistSummaryByStudent,
  buildCouponSummary,
  buildTotalPointsByStudentIds,
  distributeLuckyNumbers,
  emptyCouponSummary,
  getCouponOverview,
  getCouponSummaryByStudentIds,
  getStudentCouponSummary,
  listLuckyNumberCoupons,
  listStudentCoupons,
  listStudentLuckyNumbers,
  syncCouponsForStudents,
  validatePendingCouponsForStudents,
};
