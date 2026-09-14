const TIME_ZONE = "America/Sao_Paulo";
const TIME_ZONE_OFFSET = "-03:00";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;
const ZONED_PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  calendar: "gregory",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "2-digit",
  numberingSystem: "latn",
  second: "2-digit",
  timeZone: TIME_ZONE,
  year: "numeric",
});

function pad(value) {
  return String(value).padStart(2, "0");
}

function configureApplicationTimeZone() {
  process.env.TZ = TIME_ZONE;
}

function parseDateInSaoPaulo(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (value instanceof Date) return new Date(value.getTime());

  const text = String(value).trim();
  if (DATE_ONLY_PATTERN.test(text)) {
    return new Date(`${text}T00:00:00.000${TIME_ZONE_OFFSET}`);
  }

  if (LOCAL_DATE_TIME_PATTERN.test(text)) {
    const normalized = text.length === 16 ? `${text}:00` : text;
    return new Date(`${normalized}${TIME_ZONE_OFFSET}`);
  }

  return new Date(value);
}

function getTimeZoneParts(value) {
  const date = parseDateInSaoPaulo(value);
  if (!date || Number.isNaN(date.getTime())) return null;

  const parts = Object.fromEntries(
    ZONED_PARTS_FORMATTER.formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond: date.getUTCMilliseconds(),
  };
}

function createDateInSaoPaulo({ year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0 }) {
  const dateText = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${String(millisecond).padStart(3, "0")}`;
  return new Date(`${dateText}${TIME_ZONE_OFFSET}`);
}

function getDateKeyInSaoPaulo(value) {
  const parts = getTimeZoneParts(value);
  if (!parts) return null;
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function getStartOfDayInSaoPaulo(value = new Date()) {
  const parts = getTimeZoneParts(value);
  return parts ? createDateInSaoPaulo({ year: parts.year, month: parts.month, day: parts.day }) : null;
}

function getEndOfDayInSaoPaulo(value = new Date()) {
  const parts = getTimeZoneParts(value);
  return parts
    ? createDateInSaoPaulo({ year: parts.year, month: parts.month, day: parts.day, hour: 23, minute: 59, second: 59, millisecond: 999 })
    : null;
}

function addCalendarDaysInSaoPaulo(value, amount) {
  const parts = getTimeZoneParts(value);
  if (!parts || !Number.isFinite(Number(amount))) return null;

  const calendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + Number(amount)));
  return createDateInSaoPaulo({
    year: calendarDate.getUTCFullYear(),
    month: calendarDate.getUTCMonth() + 1,
    day: calendarDate.getUTCDate(),
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
    millisecond: parts.millisecond,
  });
}

function getDayOfWeekInSaoPaulo(value) {
  const parts = getTimeZoneParts(value);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function getMonthRangeInSaoPaulo(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: createDateInSaoPaulo({ year, month, day: 1 }),
    end: createDateInSaoPaulo({ year, month, day: lastDay, hour: 23, minute: 59, second: 59, millisecond: 999 }),
  };
}

module.exports = {
  TIME_ZONE,
  TIME_ZONE_OFFSET,
  addCalendarDaysInSaoPaulo,
  configureApplicationTimeZone,
  createDateInSaoPaulo,
  getDateKeyInSaoPaulo,
  getDayOfWeekInSaoPaulo,
  getEndOfDayInSaoPaulo,
  getMonthRangeInSaoPaulo,
  getStartOfDayInSaoPaulo,
  getTimeZoneParts,
  parseDateInSaoPaulo,
};
