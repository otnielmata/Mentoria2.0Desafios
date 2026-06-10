const turmaService = require("../services/turma.service");

async function removeStudent(req, res, next) {
  try {
    const matricula = await turmaService.removeStudentFromTurma(
      req.user.id,
      req.params.turmaId,
      req.params.alunoId
    );

    return res.status(200).json({ matricula });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  removeStudent,
};
