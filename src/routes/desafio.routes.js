const express = require("express");
const desafioController = require("../controllers/desafio.controller");
const quizController = require("../controllers/quiz.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const authenticatedRoles = [User.userRoles.student, User.userRoles.teacher, User.userRoles.admin];
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.post("/desafios", authMiddleware, authorizeRoles(adminRoles), desafioController.create);
router.get("/desafios/inscricoes/minhas", authMiddleware, authorizeRoles([User.userRoles.student]), desafioController.listMySubscriptions);
router.get("/desafios", authMiddleware, authorizeRoles(authenticatedRoles), desafioController.list);
router.delete("/desafios/inscricoes/:id", authMiddleware, authorizeRoles([User.userRoles.student]), desafioController.cancelSubscription);
router.post("/desafios/:id/inscricoes", authMiddleware, authorizeRoles([User.userRoles.student]), desafioController.subscribe);
router.get("/desafios/:id/questionario", authMiddleware, authorizeRoles([User.userRoles.student]), quizController.show);
router.post("/desafios/:id/questionario/respostas", authMiddleware, authorizeRoles([User.userRoles.student]), quizController.answer);
router.get("/desafios/:id", authMiddleware, authorizeRoles(authenticatedRoles), desafioController.show);
router.patch("/desafios/:id", authMiddleware, authorizeRoles(adminRoles), desafioController.update);
router.delete("/desafios/:id", authMiddleware, authorizeRoles(adminRoles), desafioController.disable);

module.exports = router;
