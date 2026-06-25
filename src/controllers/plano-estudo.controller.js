const planoEstudoService = require("../services/plano-estudo.service");

async function listAgenda(req, res, next) {
  try {
    const result = await planoEstudoService.getAgenda(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function listItens(req, res, next) {
  try {
    const result = await planoEstudoService.listItems(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function createItem(req, res, next) {
  try {
    const item = await planoEstudoService.createItem(req.user.id, req.body);
    return res.status(201).json({ item });
  } catch (error) {
    return next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const item = await planoEstudoService.updateItem(req.user.id, req.params.id, req.body);
    return res.status(200).json({ item });
  } catch (error) {
    return next(error);
  }
}

async function deleteItem(req, res, next) {
  try {
    const item = await planoEstudoService.deleteItem(req.user.id, req.params.id);
    return res.status(200).json({ item });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createItem,
  deleteItem,
  listAgenda,
  listItens,
  updateItem,
};
