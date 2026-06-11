const express = require("express");
const grupoController = require("../controllers/grupo.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/grupos", authMiddleware, grupoController.list);

module.exports = router;
