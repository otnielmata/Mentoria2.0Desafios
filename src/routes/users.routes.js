const express = require("express");
const profileController = require("../controllers/profile.controller");
const studentController = require("../controllers/student.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];

router.get("/me", authMiddleware, profileController.showMe);
router.post("/", authMiddleware, authorizeRoles(adminRoles), studentController.create);
router.get("/", authMiddleware, authorizeRoles(adminRoles), studentController.list);

module.exports = router;
