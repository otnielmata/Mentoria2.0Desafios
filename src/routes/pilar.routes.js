const express = require("express");
const pilarController = require("../controllers/pilar.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const authenticatedRoles = [User.userRoles.student, User.userRoles.teacher, User.userRoles.admin];
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.post("/pilares", authMiddleware, authorizeRoles(adminRoles), pilarController.create);
router.get("/pilares", authMiddleware, authorizeRoles(authenticatedRoles), pilarController.list);
router.get("/pilares/:id", authMiddleware, authorizeRoles(authenticatedRoles), pilarController.show);
router.patch("/pilares/:id", authMiddleware, authorizeRoles(adminRoles), pilarController.update);
router.delete("/pilares/:id", authMiddleware, authorizeRoles(adminRoles), pilarController.disable);

module.exports = router;
