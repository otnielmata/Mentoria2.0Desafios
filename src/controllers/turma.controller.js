const turmaService = require("../services/turma.service");

async function list(req, res, next) {
  try {
    const result = await turmaService.listTurmas(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
};
