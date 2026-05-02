const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const heuristicRoutes = require("./heuristic.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/heuristicas", heuristicRoutes);

module.exports = router;
