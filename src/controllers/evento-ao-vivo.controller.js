const eventoAoVivoService = require("../services/evento-ao-vivo.service");

async function create(req, res, next) {
  try {
    const evento = await eventoAoVivoService.createEvento(req.user.id, req.body);
    return res.status(201).json({ evento });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await eventoAoVivoService.listEventos(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const evento = await eventoAoVivoService.getEvento(req.user.id, req.params.id);
    return res.status(200).json({ evento });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const evento = await eventoAoVivoService.updateEvento(req.user.id, req.params.id, req.body);
    return res.status(200).json({ evento });
  } catch (error) {
    return next(error);
  }
}

async function disable(req, res, next) {
  try {
    const evento = await eventoAoVivoService.disableEvento(req.user.id, req.params.id);
    return res.status(200).json({ evento });
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
