const express = require("express");
const eventoAoVivoController = require("../controllers/evento-ao-vivo.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/authorization.middleware");
const User = require("../models/user.model");

const router = express.Router();
const adminRoles = [User.userRoles.teacher, User.userRoles.admin];
const eventRoles = [User.userRoles.student, User.userRoles.teacher, User.userRoles.admin];

router.post("/eventos-ao-vivo", authMiddleware, authorizeRoles(adminRoles), eventoAoVivoController.create);
router.get("/eventos-ao-vivo", authMiddleware, authorizeRoles(eventRoles), eventoAoVivoController.list);
router.get("/eventos-ao-vivo/:id", authMiddleware, authorizeRoles(eventRoles), eventoAoVivoController.show);
router.patch("/eventos-ao-vivo/:id", authMiddleware, authorizeRoles(adminRoles), eventoAoVivoController.update);
router.delete("/eventos-ao-vivo/:id", authMiddleware, authorizeRoles(adminRoles), eventoAoVivoController.disable);

module.exports = router;
