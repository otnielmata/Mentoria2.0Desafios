const pontuacaoService = require("../services/pontuacao.service");

async function createExtra(req, res, next) {
  try {
    const result = await pontuacaoService.grantExtraPoints(req.user.id, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function listExtras(req, res, next) {
  try {
    const result = await pontuacaoService.listExtraPoints(req.user.id, req.query);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function updateExtra(req, res, next) {
  try {
    const result = await pontuacaoService.updateExtraPoints(req.user.id, req.params.id, req.body);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createExtra,
  listExtras,
  updateExtra,
};
