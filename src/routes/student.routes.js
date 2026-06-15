const express = require("express");
const studentController = require("../controllers/student.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.post("/alunos", authMiddleware, authorizeRoles(adminRoles), studentController.create);
router.get("/alunos", authMiddleware, authorizeRoles(adminRoles), studentController.list);
router.get("/alunos/:id", authMiddleware, authorizeRoles(adminRoles), studentController.show);
router.patch("/alunos/:id", authMiddleware, authorizeRoles(adminRoles), studentController.update);
router.delete("/alunos/:id", authMiddleware, authorizeRoles(adminRoles), studentController.disable);

module.exports = router;
