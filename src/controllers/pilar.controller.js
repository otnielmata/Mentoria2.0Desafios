const pilarService = require("../services/pilar.service");

async function create(req, res, next) {
  try {
    const pilar = await pilarService.createPilar(req.user.id, req.body);
    return res.status(201).json({ pilar });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await pilarService.listPilares(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const pilar = await pilarService.getPilar(req.user.id, req.params.id);
    return res.status(200).json({ pilar });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const pilar = await pilarService.updatePilar(req.user.id, req.params.id, req.body);
    return res.status(200).json({ pilar });
  } catch (error) {
    return next(error);
  }
}

async function disable(req, res, next) {
  try {
    const pilar = await pilarService.disablePilar(req.user.id, req.params.id);
    return res.status(200).json({ pilar });
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
