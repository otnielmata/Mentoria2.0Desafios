const express = require("express");
const envioDesafioController = require("../controllers/envio-desafio.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const studentRoles = [User.userRoles.student];

router.post("/envios-desafios", authMiddleware, authorizeRoles(studentRoles), envioDesafioController.create);
router.get("/envios-desafios/meus", authMiddleware, authorizeRoles(studentRoles), envioDesafioController.listMine);
router.get("/me/envios-desafios", authMiddleware, authorizeRoles(studentRoles), envioDesafioController.listMine);
router.get("/envios-desafios/:id", authMiddleware, envioDesafioController.view);
router.patch("/envios-desafios/:id", authMiddleware, envioDesafioController.update);
router.put("/envios-desafios/:id/participantes", authMiddleware, envioDesafioController.updateParticipantes);
router.delete("/envios-desafios/:id", authMiddleware, envioDesafioController.cancel);

module.exports = router;
