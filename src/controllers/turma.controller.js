const turmaService = require("../services/turma.service");

async function enrollStudent(req, res, next) {
  try {
    const matricula = await turmaService.enrollStudent(req.user.id, req.params.turmaId, req.body);
    return res.status(201).json({ matricula });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  enrollStudent,
};
