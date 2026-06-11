const express = require("express");
const adminEnvioDesafioRoutes = require("./admin-envio-desafio.routes");
const authRoutes = require("./auth.routes");
const desafioRoutes = require("./desafio.routes");
const healthRoutes = require("./health.routes");

const router = express.Router();

router.use(adminEnvioDesafioRoutes);
router.use("/auth", authRoutes);
router.use(desafioRoutes);
router.use("/health", healthRoutes);

module.exports = router;
