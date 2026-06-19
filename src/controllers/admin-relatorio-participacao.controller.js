const adminRelatorioParticipacaoService = require("../services/admin-relatorio-participacao.service");

async function list(req, res, next) {
  try {
    const result = await adminRelatorioParticipacaoService.getParticipationReport(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function listStudentPillars(req, res, next) {
  try {
    const result = await adminRelatorioParticipacaoService.getStudentPillarReport(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  listStudentPillars,
};
