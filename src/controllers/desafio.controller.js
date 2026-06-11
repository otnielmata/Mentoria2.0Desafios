const desafioService = require("../services/desafio.service");

async function create(req, res, next) {
  try {
    const desafio = await desafioService.createDesafio(req.user.id, req.body);
    return res.status(201).json({ desafio });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await desafioService.listDesafios(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const desafio = await desafioService.getDesafio(req.user.id, req.params.id);
    return res.status(200).json({ desafio });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const desafio = await desafioService.updateDesafio(req.user.id, req.params.id, req.body);
    return res.status(200).json({ desafio });
  } catch (error) {
    return next(error);
  }
}

async function disable(req, res, next) {
  try {
    const desafio = await desafioService.disableDesafio(req.user.id, req.params.id);
    return res.status(200).json({ desafio });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  disable,
  list,
  show,
  update,
};
