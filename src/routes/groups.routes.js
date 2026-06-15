const express = require("express");
const studentGroupsController = require("../controllers/student-groups.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();

router.get(
  "/meus",
  authMiddleware,
  authorizeRoles([User.userRoles.student]),
  studentGroupsController.listMine
);

module.exports = router;
