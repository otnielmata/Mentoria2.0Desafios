const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const profileRoutes = require("./profile.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use(profileRoutes);

module.exports = router;
