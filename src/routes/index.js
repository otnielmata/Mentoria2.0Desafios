const express = require("express");
const authRoutes = require("./auth.routes");
const configurationRoutes = require("./configuration.routes");
const groupsRoutes = require("./groups.routes");
const healthRoutes = require("./health.routes");
const usersRoutes = require("./users.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/configuracoes", configurationRoutes);
router.use("/grupos", groupsRoutes);
router.use("/health", healthRoutes);
router.use("/users", usersRoutes);

module.exports = router;
