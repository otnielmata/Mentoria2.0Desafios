const express = require("express");
const mePontuacaoController = require("../controllers/me-pontuacao.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/me/pontuacoes", authMiddleware, mePontuacaoController.list);

module.exports = router;
