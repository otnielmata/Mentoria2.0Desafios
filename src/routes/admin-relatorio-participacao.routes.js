const express = require("express");
const adminRelatorioParticipacaoController = require("../controllers/admin-relatorio-participacao.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/admin/relatorios/participacao", authMiddleware, adminRelatorioParticipacaoController.list);

module.exports = router;
