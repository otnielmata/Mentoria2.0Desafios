const express = require("express");
const auditoriaController = require("../controllers/auditoria.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.get("/auditorias", authMiddleware, authorizeRoles(adminRoles), auditoriaController.list);
router.get("/admin/auditorias", authMiddleware, authorizeRoles(adminRoles), auditoriaController.list);

module.exports = router;
