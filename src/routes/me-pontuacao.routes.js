const express = require("express");
const mePontuacaoController = require("../controllers/me-pontuacao.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const studentRoles = [User.userRoles.student];

router.get("/pontuacoes/minha", authMiddleware, authorizeRoles(studentRoles), mePontuacaoController.list);
router.get("/me/pontuacoes", authMiddleware, authorizeRoles(studentRoles), mePontuacaoController.list);

module.exports = router;
