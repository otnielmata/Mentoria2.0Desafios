const express = require("express");
const desafioController = require("../controllers/desafio.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/desafios", authMiddleware, desafioController.create);
router.get("/desafios", authMiddleware, desafioController.list);
router.get("/desafios/:id", authMiddleware, desafioController.show);
router.patch("/desafios/:id", authMiddleware, desafioController.update);
router.delete("/desafios/:id", authMiddleware, desafioController.disable);

module.exports = router;
