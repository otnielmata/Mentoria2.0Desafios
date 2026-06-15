const express = require("express");
const turmaController = require("../controllers/turma.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.post("/turmas", authMiddleware, authorizeRoles(adminRoles), turmaController.create);
router.get("/turmas", authMiddleware, authorizeRoles(adminRoles), turmaController.list);
router.get("/turmas/:id", authMiddleware, authorizeRoles(adminRoles), turmaController.show);
router.patch("/turmas/:id", authMiddleware, authorizeRoles(adminRoles), turmaController.update);
router.patch("/turmas/:id/encerrar", authMiddleware, authorizeRoles(adminRoles), turmaController.close);
router.delete("/turmas/:id", authMiddleware, authorizeRoles(adminRoles), turmaController.close);
router.post("/turmas/:turmaId/alunos", authMiddleware, authorizeRoles(adminRoles), turmaController.enrollStudent);
router.delete(
  "/turmas/:turmaId/alunos/:alunoId",
  authMiddleware,
  authorizeRoles(adminRoles),
  turmaController.removeStudent
);

module.exports = router;
