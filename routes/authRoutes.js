const express = require("express");
const router = express.Router();
const { register, login, getMe } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Public
router.post("/register", register);
router.post("/login", login);

// Protected
router.get("/me", authMiddleware, getMe);

module.exports = router;
