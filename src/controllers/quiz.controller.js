const quizService = require("../services/quiz.service");

async function show(req, res, next) {
  try {
    const result = await quizService.getQuizState(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function answer(req, res, next) {
  try {
    const result = await quizService.answerQuizQuestion(req.user.id, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  answer,
  show,
};
