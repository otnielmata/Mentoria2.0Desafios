const studentService = require("../services/student.service");

async function show(req, res, next) {
  try {
    const student = await studentService.getStudentById(req.user.id, req.params.id);
    return res.status(200).json({ student });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  show,
};
