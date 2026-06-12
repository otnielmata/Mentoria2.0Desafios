const express = require("express");
const adminDashboardController = require("../controllers/admin-dashboard.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/admin/dashboard", authMiddleware, adminDashboardController.show);

module.exports = router;
