const pontuacaoService = require("../services/pontuacao.service");

async function createExtra(req, res, next) {
  try {
    const result = await pontuacaoService.grantExtraPoints(req.user.id, req.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createExtra,
};
