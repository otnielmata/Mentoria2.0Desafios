const express = require("express");
const turmaController = require("../controllers/turma.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.patch("/turmas/:id", authMiddleware, turmaController.update);

module.exports = router;
