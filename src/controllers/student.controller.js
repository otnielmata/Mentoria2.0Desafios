const studentService = require("../services/student.service");

async function create(req, res, next) {
  try {
    const aluno = await studentService.createStudent(req.user.id, req.body);
    return res.status(201).json({ aluno });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await studentService.listStudents(req.user.id, req.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function show(req, res, next) {
  try {
    const aluno = await studentService.getStudent(req.user.id, req.params.id);
    return res.status(200).json({ aluno });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const aluno = await studentService.updateStudent(req.user.id, req.params.id, req.body);
    return res.status(200).json({ aluno });
  } catch (error) {
    return next(error);
  }
}

async function disable(req, res, next) {
  try {
    const aluno = await studentService.disableStudent(req.user.id, req.params.id);
    return res.status(200).json({ aluno });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  disable,
  list,
  show,
  update,
};
