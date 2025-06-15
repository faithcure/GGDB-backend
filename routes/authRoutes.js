// 📁 routes/authRoutes.js - Complete updated version with user search
const express = require("express");
const router = express.Router();
const { register, login, getMe, checkEmail, updateMe } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/authMiddleware");
const User = require("../models/User");

// Public routes
router.post("/check-email", checkEmail);
router.post("/register", register);
router.post("/login", login);

// User search endpoint - Contributors için
router.get("/search-users", authMiddleware, async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.length < 2) {
            return res.json({ users: [] });
        }

        const searchRegex = new RegExp(q, 'i');
        const users = await User.find({
            $and: [
                { deleted: { $ne: true } },
                { banned: { $ne: true } },
                {
                    $or: [
                        { username: searchRegex },
                        { email: searchRegex },
                        { title: searchRegex }
                    ]
                }
            ]
        })
            .select("username email avatar title _id")
            .limit(parseInt(limit));

        res.json({ users });
    } catch (error) {
        console.error("User search error:", error);
        res.status(500).json({ message: "Search failed" });
    }
});

// Protected routes
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

module.exports = router;