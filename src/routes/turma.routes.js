const express = require("express");
const turmaController = require("../controllers/turma.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.delete("/turmas/:turmaId/alunos/:alunoId", authMiddleware, turmaController.removeStudent);

module.exports = router;
