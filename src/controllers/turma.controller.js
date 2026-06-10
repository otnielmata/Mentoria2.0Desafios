const turmaService = require("../services/turma.service");

async function update(req, res, next) {
  try {
    const turma = await turmaService.updateTurma(req.user.id, req.params.id, req.body);
    return res.status(200).json({ turma });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  update,
};
