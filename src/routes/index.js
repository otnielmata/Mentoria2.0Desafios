const express = require("express");
const adminEnvioDesafioRoutes = require("./admin-envio-desafio.routes");
const authRoutes = require("./auth.routes");
const envioDesafioRoutes = require("./envio-desafio.routes");
const healthRoutes = require("./health.routes");
const turmaRoutes = require("./turma.routes");

const router = express.Router();

router.use(adminEnvioDesafioRoutes);
router.use("/auth", authRoutes);
router.use(envioDesafioRoutes);
router.use("/health", healthRoutes);
router.use(turmaRoutes);

module.exports = router;
