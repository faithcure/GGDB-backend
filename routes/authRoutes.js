// 📁 routes/authRoutes.js - Fixed imports
const express = require("express");
const router = express.Router();
const { register, login, getMe, checkEmail, updateMe } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");

// Public routes
router.post("/check-email", checkEmail);
router.post("/register", register);
router.post("/login", login);

// Protected routes
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

module.exports = router;