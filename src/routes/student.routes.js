const express = require("express");
const studentController = require("../controllers/student.controller");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/alunos/:id", authMiddleware, studentController.show);

module.exports = router;
