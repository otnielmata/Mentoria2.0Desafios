const express = require("express");
const studentController = require("../controllers/student.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/alunos", authMiddleware, studentController.create);
router.get("/alunos", authMiddleware, studentController.list);
router.get("/alunos/:id", authMiddleware, studentController.show);
router.patch("/alunos/:id", authMiddleware, studentController.update);
router.delete("/alunos/:id", authMiddleware, studentController.disable);

module.exports = router;
