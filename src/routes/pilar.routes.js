const express = require("express");
const pilarController = require("../controllers/pilar.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/pilares/:id", authMiddleware, pilarController.show);

module.exports = router;
