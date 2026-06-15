const express = require("express");
const userSessionController = require("../controllers/user-session.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/me", authMiddleware, userSessionController.me);

module.exports = router;
