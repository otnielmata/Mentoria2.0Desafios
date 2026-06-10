const express = require("express");
const turmaController = require("../controllers/turma.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/turmas", authMiddleware, turmaController.create);

module.exports = router;
