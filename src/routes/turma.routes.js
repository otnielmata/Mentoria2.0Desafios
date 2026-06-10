const express = require("express");
const turmaController = require("../controllers/turma.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.patch("/turmas/:id/encerrar", authMiddleware, turmaController.close);

module.exports = router;
