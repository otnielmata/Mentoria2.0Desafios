const adminDashboardService = require("../services/admin-dashboard.service");

async function show(req, res, next) {
  try {
    const result = await adminDashboardService.getAdminDashboard(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  show,
};
