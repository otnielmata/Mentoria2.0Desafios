const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const pilarRoutes = require("./pilar.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use(pilarRoutes);

module.exports = router;
