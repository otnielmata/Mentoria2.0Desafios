const express = require("express");
const pilarController = require("../controllers/pilar.controller");

const router = express.Router();

router.get("/pilares", pilarController.list);

module.exports = router;
