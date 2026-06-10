const turmaService = require("../services/turma.service");

async function create(req, res, next) {
  try {
    const turma = await turmaService.createTurma(req.user.id, req.body);
    return res.status(201).json({ turma });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
};
