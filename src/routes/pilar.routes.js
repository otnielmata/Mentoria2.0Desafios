const express = require("express");
const pilarController = require("../controllers/pilar.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/pilares", authMiddleware, pilarController.create);

module.exports = router;
