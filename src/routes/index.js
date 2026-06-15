const express = require("express");
const authRoutes = require("./auth.routes");
const configurationRoutes = require("./configuration.routes");
const healthRoutes = require("./health.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/configuracoes", configurationRoutes);
router.use("/health", healthRoutes);

module.exports = router;
