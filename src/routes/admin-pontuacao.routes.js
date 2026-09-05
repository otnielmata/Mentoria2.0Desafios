const express = require("express");
const adminPontuacaoController = require("../controllers/admin-pontuacao.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.post("/pontuacoes/extras", authMiddleware, authorizeRoles(adminRoles), adminPontuacaoController.createExtra);
router.get("/pontuacoes/extras", authMiddleware, authorizeRoles(adminRoles), adminPontuacaoController.listExtras);
router.patch("/pontuacoes/extras/:id", authMiddleware, authorizeRoles(adminRoles), adminPontuacaoController.updateExtra);

module.exports = router;
