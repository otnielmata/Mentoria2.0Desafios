const express = require("express");
const meDashboardController = require("../controllers/me-dashboard.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/me/dashboard", authMiddleware, meDashboardController.show);

module.exports = router;
