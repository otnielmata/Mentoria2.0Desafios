const EVENT_TYPE_META = {
  ao_vivo: { label: "Ao vivo", color: "#e91e63", icon: "live_tv" },
  modulo_gravado: { label: "Módulo gravado", color: "#009ec6", icon: "play_circle" },
  conteudo_especial: { label: "Convidado especial", color: "#fdb022", icon: "star" },
};

const PERSONAL_EVENT_META = {
  label: "Meu planejamento",
  color: "#8502ab",
  icon: "edit_calendar",
};

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function endOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(23, 59, 59, 999);
  return nextDate;
}

function formatCalendarDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatDateTimeInputValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDateKeyFromDateTimeInput(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";
}

function toIsoFromDateTimeInput(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function buildDefaultScoreWindowStartKey(plannedDateKey) {
  const referenceDate = new Date(`${plannedDateKey}T00:00:00`);
  if (Number.isNaN(referenceDate.getTime())) return plannedDateKey;
  referenceDate.setDate(referenceDate.getDate() - referenceDate.getDay());
  return toDateKey(referenceDate);
}

function addDaysToDateKey(dateKey, amount) {
  const referenceDate = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(referenceDate.getTime())) return "";
  referenceDate.setDate(referenceDate.getDate() + amount);
  return toDateKey(referenceDate);
}

function getChecklistPointsForCompletedDays(totalCompletedDays) {
  if (totalCompletedDays <= 0) return 0;
  if (totalCompletedDays <= 3) return 1;
  if (totalCompletedDays <= 6) return 2;
  return 3;
}

function normalizeChecklistItem(item = {}) {
  const plannedDateKey = item.plannedDateKey || item.dataPlanejada || toDateKey(item.startAt || item.dataInicio);
  const scoreWindowStartKey = item.scoreWindowStartKey || item.janelaPontuacaoInicio || buildDefaultScoreWindowStartKey(plannedDateKey);
  const completedAt = item.completedAt || item.concluidoEm || null;
  const completed = Boolean(item.completed || item.concluido || completedAt);

  return {
    id: item.id,
    title: item.title || item.titulo,
    notes: item.notes || item.observacoes || "",
    startAt: item.startAt || item.dataInicio,
    endAt: item.endAt || item.dataFim,
    plannedDateKey,
    scoreWindowStartKey,
    scoreWindowEndKey: addDaysToDateKey(scoreWindowStartKey, 6),
    completed,
    completedAt,
    color: item.color || PERSONAL_EVENT_META.color,
    status: item.status,
  };
}

function canToggleChecklistItem(item, referenceDate = new Date()) {
  const normalizedItem = normalizeChecklistItem(item);
  if (normalizedItem.completed) return true;
  const currentDateKey = toDateKey(referenceDate);
  if (!normalizedItem.plannedDateKey || !currentDateKey) return true;
  return normalizedItem.plannedDateKey <= currentDateKey;
}

function groupChecklistItemsByDate(items = []) {
  return items
    .map(normalizeChecklistItem)
    .sort((left, right) => {
      const leftTime = left.startAt ? new Date(left.startAt).getTime() : 0;
      const rightTime = right.startAt ? new Date(right.startAt).getTime() : 0;
      return leftTime - rightTime;
    })
    .reduce((accumulator, item) => {
      const currentItems = accumulator[item.plannedDateKey] || [];
      currentItems.push(item);
      accumulator[item.plannedDateKey] = currentItems;
      return accumulator;
    }, {});
}

function buildChecklistSummaryViewModel(items = []) {
  const normalizedItems = items.map(normalizeChecklistItem);
  const windowsByKey = new Map();
  const completedDays = new Set();
  let totalCompletedTasks = 0;

  normalizedItems.forEach((item) => {
    const currentWindow = windowsByKey.get(item.scoreWindowStartKey) || {
      inicio: item.scoreWindowStartKey,
      fim: item.scoreWindowEndKey,
      totalTarefas: 0,
      tarefasConcluidas: 0,
      dias: new Map(),
    };
    const currentDay = currentWindow.dias.get(item.plannedDateKey) || {
      data: item.plannedDateKey,
      totalTarefas: 0,
      tarefasConcluidas: 0,
      concluidoNoDia: false,
    };

    currentWindow.totalTarefas += 1;
    currentDay.totalTarefas += 1;

    if (item.completed) {
      currentWindow.tarefasConcluidas += 1;
      currentDay.tarefasConcluidas += 1;
      currentDay.concluidoNoDia = true;
      totalCompletedTasks += 1;
      completedDays.add(item.plannedDateKey);
    }

    currentWindow.dias.set(item.plannedDateKey, currentDay);
    windowsByKey.set(item.scoreWindowStartKey, currentWindow);
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
    totalTarefas: normalizedItems.length,
    tarefasConcluidas: totalCompletedTasks,
    diasComCheck: completedDays.size,
    totalPontos: semanas.reduce((total, semana) => total + Number(semana.pontos || 0), 0),
    semanas,
    tarefasPorData: groupChecklistItemsByDate(normalizedItems),
  };
}

function buildWeeklyStudyQuery(startAt) {
  const referenceDate = new Date(startAt);
  if (Number.isNaN(referenceDate.getTime())) {
    return null;
  }

  const rangeStart = startOfDay(referenceDate);
  const rangeEnd = endOfDay(addDays(rangeStart, 6));

  return {
    startDate: rangeStart.toISOString(),
    endDate: rangeEnd.toISOString(),
    limit: 500,
  };
}

function getStudyDurationMinutes(startAt, endAt) {
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 90;
  }

  const differenceMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  if (differenceMinutes <= 0) {
    return 90;
  }

  return Math.max(90, differenceMinutes);
}

function hasLiveMentoriaEvent(event = {}) {
  const source = event.source || (event.readOnly ? "mentoria" : "pessoal");
  const type = event.type || event.tipo;
  return source === "mentoria" && type === "ao_vivo";
}

function buildWeeklyStudySessions({ startAt, endAt, liveEvents = [] }) {
  const referenceDate = new Date(startAt);
  if (Number.isNaN(referenceDate.getTime())) {
    return [];
  }

  const durationMinutes = getStudyDurationMinutes(startAt, endAt);
  const rangeStart = startOfDay(referenceDate);
  const scoreWindowStartKey = toDateKey(rangeStart);
  const blockedDays = new Set(liveEvents.filter(hasLiveMentoriaEvent).map((event) => toDateKey(event.startAt || event.dataInicio)));
  const sessionHours = referenceDate.getHours();
  const sessionMinutes = referenceDate.getMinutes();

  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(rangeStart, index);
    const dayKey = toDateKey(day);
    if (blockedDays.has(dayKey)) {
      return null;
    }

    const sessionStart = new Date(day);
    sessionStart.setHours(sessionHours, sessionMinutes, 0, 0);

    const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60000);

    return {
      dateKey: dayKey,
      plannedDateKey: dayKey,
      scoreWindowStartKey,
      startAt: sessionStart.toISOString(),
      endAt: sessionEnd.toISOString(),
    };
  }).filter(Boolean);
}

function toDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMonthLabel(year, month) {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = firstDay.getDay();
  const cells = [];

  for (let index = 0; index < startWeekday; index += 1) {
    const date = new Date(year, month - 1, index - startWeekday + 1);
    cells.push({
      date: date.toISOString(),
      day: date.getDate(),
      inMonth: false,
      key: toDateKey(date),
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    cells.push({
      date: date.toISOString(),
      day,
      inMonth: true,
      key: toDateKey(date),
    });
  }

  while (cells.length % 7 !== 0) {
    const lastCell = cells[cells.length - 1];
    const nextDate = new Date(lastCell.date);
    nextDate.setDate(nextDate.getDate() + 1);
    cells.push({
      date: nextDate.toISOString(),
      day: nextDate.getDate(),
      inMonth: false,
      key: toDateKey(nextDate),
    });
  }

  const weeks = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

function groupEventsByDay(events = []) {
  return events.reduce((accumulator, event) => {
    const key = toDateKey(event.startAt || event.dataInicio);
    if (!key) return accumulator;
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(normalizeCalendarEvent(event));
    return accumulator;
  }, {});
}

function normalizeCalendarEvent(event = {}) {
  const source = event.source || (event.readOnly ? "mentoria" : "pessoal");
  const type = event.type || event.tipo || (source === "pessoal" ? "pessoal" : "ao_vivo");
  const meta = source === "pessoal" ? PERSONAL_EVENT_META : EVENT_TYPE_META[type] || EVENT_TYPE_META.ao_vivo;

  return {
    id: event.id,
    title: event.title || event.titulo,
    startAt: event.startAt || event.dataInicio,
    endAt: event.endAt || event.dataFim,
    type,
    source,
    editable: Boolean(event.editable),
    readOnly: Boolean(event.readOnly || source === "mentoria"),
    guestName: event.guestName || event.convidado || "",
    weekNumber: event.weekNumber || event.semana,
    notes: event.notes || event.observacoes || event.description || event.descricao || "",
    turmaName: event.turma && (event.turma.name || event.turma.nome),
    color: event.color || meta.color,
    meta,
    timeLabel: formatTime(event.startAt || event.dataInicio),
  };
}

function buildCalendarViewModel({ year, month, events = [], showPersonal = true, showMentoria = true }) {
  const normalizedEvents = events
    .map(normalizeCalendarEvent)
    .filter((event) => {
      if (event.source === "mentoria" && !showMentoria) return false;
      if (event.source === "pessoal" && !showPersonal) return false;
      return true;
    });

  return {
    monthLabel: formatMonthLabel(year, month),
    weekdayLabels: WEEKDAY_LABELS,
    weeks: buildMonthGrid(year, month),
    eventsByDay: groupEventsByDay(normalizedEvents),
    legend: [
      { key: "mentoria-live", label: "Ao vivo", color: EVENT_TYPE_META.ao_vivo.color },
      { key: "mentoria-recorded", label: "Módulo gravado", color: EVENT_TYPE_META.modulo_gravado.color },
      { key: "mentoria-special", label: "Convidado especial", color: EVENT_TYPE_META.conteudo_especial.color },
      { key: "personal", label: "Meu planejamento", color: PERSONAL_EVENT_META.color },
    ],
  };
}

function shiftMonth(year, month, delta) {
  const date = new Date(year, month - 1 + delta, 1);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
}

function getCurrentMonthRef(referenceDate = new Date()) {
  return {
    year: referenceDate.getFullYear(),
    month: referenceDate.getMonth() + 1,
  };
}

function buildAgendaQuery({ year, month }) {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return {
    month,
    year,
    limit: 500,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

module.exports = {
  EVENT_TYPE_META,
  PERSONAL_EVENT_META,
  buildAgendaQuery,
  buildCalendarViewModel,
  canToggleChecklistItem,
  buildChecklistSummaryViewModel,
  buildWeeklyStudyQuery,
  buildWeeklyStudySessions,
  formatCalendarDate,
  formatDateTimeInputValue,
  formatMonthLabel,
  formatTime,
  getChecklistPointsForCompletedDays,
  getCurrentMonthRef,
  getDateKeyFromDateTimeInput,
  groupEventsByDay,
  groupChecklistItemsByDate,
  normalizeChecklistItem,
  normalizeCalendarEvent,
  shiftMonth,
  toDateKey,
  toIsoFromDateTimeInput,
};
