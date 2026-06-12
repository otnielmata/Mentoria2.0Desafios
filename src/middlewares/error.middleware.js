function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Erro interno do servidor.";
  const code = error.code || (statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");
  const details = error.details;

  if (statusCode >= 500) {
    // Keep stack only in terminal logs for easier debugging.
    console.error(error);
  }

  return res.status(statusCode).json({
    message,
    code,
    ...(details ? { details } : {}),
  });
}

module.exports = errorMiddleware;
