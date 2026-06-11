const express = require("express");
const profileController = require("../controllers/profile.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/me", authMiddleware, profileController.showMe);
router.patch("/me", authMiddleware, profileController.updateMe);

module.exports = router;
