const express = require("express");
const healthController = require("../controllers/health.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", healthController.healthCheck);
router.get("/protected", authMiddleware, healthController.protectedExample);

module.exports = router;
