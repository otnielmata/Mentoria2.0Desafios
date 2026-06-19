const express = require("express");
const profileController = require("../controllers/profile.controller");
const userManagementController = require("../controllers/user-management.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.admin];

router.get("/me", authMiddleware, profileController.showMe);
router.post("/", authMiddleware, authorizeRoles(adminRoles), userManagementController.create);
router.get("/", authMiddleware, authorizeRoles(adminRoles), userManagementController.list);
router.get("/:id", authMiddleware, authorizeRoles(adminRoles), userManagementController.show);
router.patch("/:id", authMiddleware, authorizeRoles(adminRoles), userManagementController.update);
router.delete("/:id", authMiddleware, authorizeRoles(adminRoles), userManagementController.remove);

module.exports = router;
