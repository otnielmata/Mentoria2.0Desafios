const express = require("express");
const grupoController = require("../controllers/grupo.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const studentRoles = [User.userRoles.student];
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.get("/grupos/meus", authMiddleware, authorizeRoles(studentRoles), grupoController.list);
router.patch("/grupos/:id/contato", authMiddleware, authorizeRoles(studentRoles), grupoController.updateContact);
router.get("/grupos", authMiddleware, authorizeRoles(adminRoles), grupoController.list);

module.exports = router;
