const express = require("express");
const cupomController = require("../controllers/cupom.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.get("/cupons/alunos", authMiddleware, authorizeRoles(adminRoles), cupomController.listStudents);
router.get("/admin/cupons/alunos", authMiddleware, authorizeRoles(adminRoles), cupomController.listStudents);
router.get("/cupons/numeros-sorte", authMiddleware, authorizeRoles(adminRoles), cupomController.listLuckyNumberCoupons);
router.get("/admin/cupons/numeros-sorte", authMiddleware, authorizeRoles(adminRoles), cupomController.listLuckyNumberCoupons);
router.post("/cupons/distribuicao/numeros-sorte", authMiddleware, authorizeRoles(adminRoles), cupomController.distributeLuckyNumbers);
router.post("/admin/cupons/distribuicao/numeros-sorte", authMiddleware, authorizeRoles(adminRoles), cupomController.distributeLuckyNumbers);
router.get("/relatorios/cupons-sorte", authMiddleware, authorizeRoles(adminRoles), cupomController.listLuckyNumberStudents);
router.get("/admin/relatorios/cupons-sorte", authMiddleware, authorizeRoles(adminRoles), cupomController.listLuckyNumberStudents);

module.exports = router;
