const express = require("express");
const studentController = require("../controllers/student.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/alunos", authMiddleware, studentController.create);

module.exports = router;
