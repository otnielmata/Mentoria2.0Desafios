const adminEnvioDesafioService = require("../services/admin-envio-desafio.service");

async function listPending(req, res, next) {
  try {
    const result = await adminEnvioDesafioService.listPending(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function evaluate(req, res, next) {
  try {
    const result = await adminEnvioDesafioService.evaluateEnvio(req.user.id, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function evaluateFromBody(req, res, next) {
  try {
    const envioId = req.body.envio_desafio_id || req.body.envioDesafioId || req.body.envioId || req.body.id;
    const result = await adminEnvioDesafioService.evaluateEnvio(req.user.id, envioId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  evaluate,
  evaluateFromBody,
  listPending,
};
