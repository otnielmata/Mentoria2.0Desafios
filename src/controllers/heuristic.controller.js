const heuristicService = require("../services/heuristic.service");

async function list(req, res, next) {
  try {
    const heuristics = await heuristicService.listHeuristics();
    return res.status(200).json(heuristics);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
};
