const express = require("express");
const planoEstudoController = require("../controllers/plano-estudo.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const studentRoles = [User.userRoles.student];

router.get("/plano-estudo/agenda", authMiddleware, authorizeRoles(studentRoles), planoEstudoController.listAgenda);
router.get("/plano-estudo/itens", authMiddleware, authorizeRoles(studentRoles), planoEstudoController.listItens);
router.post("/plano-estudo/itens", authMiddleware, authorizeRoles(studentRoles), planoEstudoController.createItem);
router.patch("/plano-estudo/itens/:id", authMiddleware, authorizeRoles(studentRoles), planoEstudoController.updateItem);
router.delete("/plano-estudo/itens/:id", authMiddleware, authorizeRoles(studentRoles), planoEstudoController.deleteItem);

module.exports = router;
