const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const usersRoutes = require("./users.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/usuarios", usersRoutes);

module.exports = router;
