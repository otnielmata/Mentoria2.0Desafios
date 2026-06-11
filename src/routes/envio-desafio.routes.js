const express = require("express");
const envioDesafioController = require("../controllers/envio-desafio.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/envios-desafios", authMiddleware, envioDesafioController.create);
router.get("/me/envios-desafios", authMiddleware, envioDesafioController.listMine);
router.get("/envios-desafios/:id", authMiddleware, envioDesafioController.view);
router.patch("/envios-desafios/:id", authMiddleware, envioDesafioController.update);
router.put("/envios-desafios/:id/participantes", authMiddleware, envioDesafioController.updateParticipantes);
router.delete("/envios-desafios/:id", authMiddleware, envioDesafioController.cancel);

module.exports = router;
