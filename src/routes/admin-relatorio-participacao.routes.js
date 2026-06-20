const express = require("express");
const adminRelatorioParticipacaoController = require("../controllers/admin-relatorio-participacao.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.get("/relatorios/participacao", authMiddleware, authorizeRoles(adminRoles), adminRelatorioParticipacaoController.list);
router.get("/relatorios/alunos/pilares", authMiddleware, authorizeRoles(adminRoles), adminRelatorioParticipacaoController.listStudentPillars);
router.get("/relatorios/grupos-desafios", authMiddleware, authorizeRoles(adminRoles), adminRelatorioParticipacaoController.listChallengeGroups);
router.get("/admin/relatorios/participacao", authMiddleware, authorizeRoles(adminRoles), adminRelatorioParticipacaoController.list);
router.get("/admin/relatorios/alunos/pilares", authMiddleware, authorizeRoles(adminRoles), adminRelatorioParticipacaoController.listStudentPillars);
router.get("/admin/relatorios/grupos-desafios", authMiddleware, authorizeRoles(adminRoles), adminRelatorioParticipacaoController.listChallengeGroups);

module.exports = router;
