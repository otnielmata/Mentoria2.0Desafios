const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const turmaRoutes = require("./turma.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use(turmaRoutes);

module.exports = router;
