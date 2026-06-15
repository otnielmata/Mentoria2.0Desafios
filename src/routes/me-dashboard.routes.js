const express = require("express");
const meDashboardController = require("../controllers/me-dashboard.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const studentRoles = [User.userRoles.student];

router.get("/dashboard/aluno", authMiddleware, authorizeRoles(studentRoles), meDashboardController.show);
router.get("/me/dashboard", authMiddleware, authorizeRoles(studentRoles), meDashboardController.show);

module.exports = router;
