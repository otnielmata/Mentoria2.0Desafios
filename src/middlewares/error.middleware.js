function errorMiddleware(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Erro interno do servidor.";
  let code = error.code || (statusCode >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR");
  let details = error.details;

  if (error && error.code === 11000) {
    statusCode = 409;
    message = "Já existe um registro com esses dados.";
    code = "DUPLICATE_RESOURCE";
    details = undefined;
  } else if (error && error.name === "ValidationError") {
    statusCode = 400;
    message = "Dados inválidos enviados para a API.";
    code = "VALIDATION_ERROR";
    details = undefined;
  } else if (error && error.name === "CastError") {
    statusCode = 400;
    message = "Um identificador informado é inválido.";
    code = "INVALID_IDENTIFIER";
    details = undefined;
  } else if (error && error.type === "entity.too.large") {
    statusCode = 413;
    message = "O arquivo enviado excede o limite permitido de 10 MB.";
    code = "ATTACHMENT_TOO_LARGE";
    details = undefined;
  }

  if (statusCode >= 500) {
    message = "Ocorreu um erro interno. Tente novamente em alguns instantes.";
    code = "INTERNAL_ERROR";
    details = undefined;
  }

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
