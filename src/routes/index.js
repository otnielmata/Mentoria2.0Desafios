const express = require("express");
const authRoutes = require("./auth.routes");
const healthRoutes = require("./health.routes");
const studentRoutes = require("./student.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use(studentRoutes);

module.exports = router;
