const express = require("express");
const rankingController = require("../controllers/ranking.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/rankings", authMiddleware, rankingController.list);
router.get("/rankings/geral", authMiddleware, rankingController.list);

module.exports = router;
