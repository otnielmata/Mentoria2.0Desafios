const studentService = require("../services/student.service");

async function create(req, res, next) {
  try {
    const student = await studentService.createStudent(req.user.id, req.body);
    return res.status(201).json({ student });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
};
