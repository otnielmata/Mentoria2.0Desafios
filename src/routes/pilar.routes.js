const express = require("express");
const pilarController = require("../controllers/pilar.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/pilares", authMiddleware, pilarController.create);
router.get("/pilares", authMiddleware, pilarController.list);
router.get("/pilares/:id", authMiddleware, pilarController.show);
router.patch("/pilares/:id", authMiddleware, pilarController.update);
router.delete("/pilares/:id", authMiddleware, pilarController.disable);

module.exports = router;
