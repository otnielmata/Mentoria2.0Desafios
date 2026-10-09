const DEFAULT_SLOW_REQUEST_MS = 1000;

function getSlowRequestLimit() {
  const configured = Number(process.env.SLOW_REQUEST_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_SLOW_REQUEST_MS;
}

function requestTimingMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const originalEnd = res.end;

  res.end = function timedResponseEnd(...args) {
    if (!res.headersSent) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const roundedDurationMs = Math.round(durationMs * 100) / 100;
      res.setHeader("Server-Timing", `app;dur=${roundedDurationMs}`);
    }
    return originalEnd.apply(this, args);
  };

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const roundedDurationMs = Math.round(durationMs * 100) / 100;

    if (durationMs >= getSlowRequestLimit()) {
      console.warn(
        JSON.stringify({
          type: "slow_request",
          method: req.method,
          path: req.originalUrl || req.url,
          status: res.statusCode,
          durationMs: roundedDurationMs,
        })
      );
    }
  });

  next();
}

module.exports = requestTimingMiddleware;
