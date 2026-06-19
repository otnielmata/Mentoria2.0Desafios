const express = require("express");
const adminPontuacaoController = require("../controllers/admin-pontuacao.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.post("/pontuacoes/extras", authMiddleware, authorizeRoles(adminRoles), adminPontuacaoController.createExtra);

module.exports = router;
