const express = require("express");
const configurationController = require("../controllers/configuration.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  authorizeRoles([User.userRoles.teacher, User.userRoles.admin]),
  configurationController.listConfigurations
);

module.exports = router;
