const Heuristic = require("../models/heuristic.model");

function toListItem(heuristic) {
  return {
    id: heuristic.id || String(heuristic._id),
    title: heuristic.title,
    description: heuristic.description,
    createdAt: heuristic.createdAt,
  };
}

async function listHeuristics() {
  const heuristics = await Heuristic.find({
    isActive: { $ne: false },
    isPublicable: { $ne: false },
  })
    .sort({ createdAt: -1 })
    .lean();

  return heuristics.map(toListItem);
}

module.exports = {
  listHeuristics,
};
