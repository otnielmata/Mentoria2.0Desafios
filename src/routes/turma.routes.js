const express = require("express");
const turmaController = require("../controllers/turma.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/turmas", authMiddleware, turmaController.list);

module.exports = router;
