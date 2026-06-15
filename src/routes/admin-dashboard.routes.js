const express = require("express");
const adminDashboardController = require("../controllers/admin-dashboard.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.get("/admin/dashboard", authMiddleware, authorizeRoles(adminRoles), adminDashboardController.show);
router.get("/dashboard/admin", authMiddleware, authorizeRoles(adminRoles), adminDashboardController.show);

module.exports = router;
