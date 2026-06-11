const meDashboardService = require("../services/me-dashboard.service");

async function show(req, res, next) {
  try {
    const result = await meDashboardService.getMyDashboard(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  show,
};
