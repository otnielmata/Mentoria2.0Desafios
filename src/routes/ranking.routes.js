const express = require("express");
const rankingController = require("../controllers/ranking.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const authenticatedRoles = [User.userRoles.student, User.userRoles.teacher, User.userRoles.admin];
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.get("/ranking", authMiddleware, authorizeRoles(authenticatedRoles), rankingController.list);
router.get("/ranking/admin", authMiddleware, authorizeRoles(adminRoles), rankingController.list);
router.get("/rankings", authMiddleware, authorizeRoles(authenticatedRoles), rankingController.list);
router.get("/rankings/geral", authMiddleware, authorizeRoles(authenticatedRoles), rankingController.list);

module.exports = router;
