const heuristicService = require("../services/heuristic.service");

async function create(req, res, next) {
  try {
    const { title, description } = req.body;
    const heuristic = await heuristicService.createHeuristic({
      title,
      description,
      user: req.user,
    });

    return res.status(201).json(heuristic);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
};
