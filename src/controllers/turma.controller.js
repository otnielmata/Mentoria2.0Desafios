const turmaService = require("../services/turma.service");

async function create(req, res, next) {
  try {
    const turma = await turmaService.createTurma(req.user.id, req.body);
    return res.status(201).json({ turma });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await turmaService.listTurmas(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const turma = await turmaService.getTurma(req.user.id, req.params.id);
    return res.status(200).json({ turma });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const turma = await turmaService.updateTurma(req.user.id, req.params.id, req.body);
    return res.status(200).json({ turma });
  } catch (error) {
    return next(error);
  }
}

async function close(req, res, next) {
  try {
    const turma = await turmaService.closeTurma(req.user.id, req.params.id);
    return res.status(200).json({ turma });
  } catch (error) {
    return next(error);
  }
}

async function enrollStudent(req, res, next) {
  try {
    const matricula = await turmaService.enrollStudent(req.user.id, req.params.turmaId, req.body);
    return res.status(201).json({ matricula });
  } catch (error) {
    return next(error);
  }
}

async function removeStudent(req, res, next) {
  try {
    const matricula = await turmaService.removeStudent(req.user.id, req.params.turmaId, req.params.alunoId);
    return res.status(200).json({ matricula });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  close,
  create,
  enrollStudent,
  list,
  removeStudent,
  show,
  update,
};
