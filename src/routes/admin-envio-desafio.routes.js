const express = require("express");
const adminEnvioDesafioController = require("../controllers/admin-envio-desafio.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/admin/envios-desafios/pendentes", authMiddleware, adminEnvioDesafioController.listPending);
router.patch("/admin/envios-desafios/:id/avaliacao", authMiddleware, adminEnvioDesafioController.evaluate);

module.exports = router;
