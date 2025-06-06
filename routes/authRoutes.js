// 📁 routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { register, login, getMe, checkEmail } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { updateMe } = require("../controllers/authController");

// Public
router.post("/check-email", checkEmail); 
router.post("/register", register);
router.post("/login", login);

// Protected
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

module.exports = router;
