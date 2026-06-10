const turmaService = require("../services/turma.service");

async function getById(req, res, next) {
  try {
    const turma = await turmaService.getTurmaById(req.user.id, req.params.id);
    return res.status(200).json({ turma });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getById,
};
