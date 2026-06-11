const express = require("express");
const adminBaixaParticipacaoController = require("../controllers/admin-baixa-participacao.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/admin/relatorios/baixa-participacao", authMiddleware, adminBaixaParticipacaoController.list);

module.exports = router;
