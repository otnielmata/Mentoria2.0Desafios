const express = require("express");
const adminEnvioDesafioController = require("../controllers/admin-envio-desafio.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.get("/envios-desafios/aprovacoes", authMiddleware, authorizeRoles(adminRoles), adminEnvioDesafioController.listPending);
router.patch(
  "/envios-desafios/aprovacoes",
  authMiddleware,
  authorizeRoles(adminRoles),
  adminEnvioDesafioController.evaluateFromBody
);
router.get("/admin/envios-desafios/pendentes", authMiddleware, authorizeRoles(adminRoles), adminEnvioDesafioController.listPending);
router.patch(
  "/admin/envios-desafios/:id/avaliacao",
  authMiddleware,
  authorizeRoles(adminRoles),
  adminEnvioDesafioController.evaluate
);

module.exports = router;
