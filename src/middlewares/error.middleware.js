function errorMiddleware(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Erro interno do servidor.";

  if (statusCode >= 500) {
    // Keep stack only in terminal logs for easier debugging.
    console.error(error);
  }

  return res.status(statusCode).json({ message });
}

module.exports = errorMiddleware;
