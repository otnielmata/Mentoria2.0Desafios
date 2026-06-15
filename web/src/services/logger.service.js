import { publicEnv } from "@/config/env";

export const sensitiveKeyPattern = /(authorization|cookie|database|jwt|mongodb|password|private|secret|senha|token)/i;
export const redactedValue = "[redacted]";

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Error);
}

function shouldLogInConsole(env = publicEnv) {
  return env.appEnv === "development";
}

export function sanitizeText(value = "") {
  return String(value)
    .replace(/Bearer\s+[^\s]+/gi, `Bearer ${redactedValue}`)
    .replace(/(authorization|jwt|password|secret|senha|token)=([^&\s]+)/gi, `$1=${redactedValue}`);
}

export function sanitizeValue(value) {
  if (value instanceof Error) {
    return {
      message: sanitizeText(value.message),
      name: value.name,
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        sensitiveKeyPattern.test(key) ? redactedValue : sanitizeValue(entryValue),
      ])
    );
  }

  if (typeof value === "string") {
    return sanitizeText(value);
  }

  return value;
}

export function createLogEvent(level, event, context = {}) {
  return {
    context: sanitizeValue(context),
    event,
    level,
    timestamp: new Date().toISOString(),
  };
}

export function createLogger({
  enabled = shouldLogInConsole(),
  sink = console,
} = {}) {
  function emit(level, event, context) {
    const logEvent = createLogEvent(level, event, context);

    if (!enabled || typeof sink[level] !== "function") {
      return logEvent;
    }

    sink[level](`[web:${event}]`, logEvent.context);
    return logEvent;
  }

  return {
    error: (event, context) => emit("error", event, context),
    info: (event, context) => emit("info", event, context),
  };
}

export const logger = createLogger();

export function logError(event, context = {}) {
  return logger.error(event, context);
}

export function createApiErrorLogContext({
  endpoint,
  error,
  message,
  method,
  status,
  type,
} = {}) {
  return sanitizeValue({
    endpoint,
    error,
    message,
    method: method || "GET",
    status,
    type,
  });
}
