const adminBaixaParticipacaoService = require("../services/admin-baixa-participacao.service");

async function list(req, res, next) {
  try {
    const result = await adminBaixaParticipacaoService.getLowParticipationReport(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
};
