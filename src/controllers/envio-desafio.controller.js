const envioDesafioService = require("../services/envio-desafio.service");

async function create(req, res, next) {
  try {
    const envio = await envioDesafioService.createEnvioDesafio(req.user.id, req.body);
    return res.status(201).json({ envio });
  } catch (error) {
    return next(error);
  }
}

async function listMine(req, res, next) {
  try {
    const result = await envioDesafioService.listMine(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function view(req, res, next) {
  try {
    const envio = await envioDesafioService.getEnvio(req.user.id, req.params.id);
    return res.status(200).json({ envio });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const envio = await envioDesafioService.updateEnvio(req.user.id, req.params.id, req.body);
    return res.status(200).json({ envio });
  } catch (error) {
    return next(error);
  }
}

async function updateParticipantes(req, res, next) {
  try {
    const envio = await envioDesafioService.updateParticipantes(req.user.id, req.params.id, req.body);
    return res.status(200).json({ envio });
  } catch (error) {
    return next(error);
  }
}

async function cancel(req, res, next) {
  try {
    const envio = await envioDesafioService.cancelEnvio(req.user.id, req.params.id);
    return res.status(200).json({ envio });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  cancel,
  create,
  listMine,
  update,
  updateParticipantes,
  view,
};
