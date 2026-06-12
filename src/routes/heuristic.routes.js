const express = require("express");
const heuristicController = require("../controllers/heuristic.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/", authMiddleware, heuristicController.create);
router.get("/", authMiddleware, heuristicController.list);

module.exports = router;
