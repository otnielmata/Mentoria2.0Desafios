const express = require("express");
const turmaController = require("../controllers/turma.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/turmas", authMiddleware, turmaController.create);
router.get("/turmas", authMiddleware, turmaController.list);
router.get("/turmas/:id", authMiddleware, turmaController.show);
router.patch("/turmas/:id", authMiddleware, turmaController.update);
router.patch("/turmas/:id/encerrar", authMiddleware, turmaController.close);
router.post("/turmas/:turmaId/alunos", authMiddleware, turmaController.enrollStudent);
router.delete("/turmas/:turmaId/alunos/:alunoId", authMiddleware, turmaController.removeStudent);

module.exports = router;
