const express = require("express");
const router = express.Router();
const { authMiddleware, adminOnly } = require("../middleware/authMiddleware");
const User = require("../models/User");

// ✅ Admin: Tüm kullanıcıları getir
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// ✅ Admin: Kullanıcının rolünü değiştir
router.put("/users/:id/role", authMiddleware, adminOnly, async (req, res) => {
  const { role } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
});

// ✅ Admin: Kullanıcıyı sil (soft delete)
router.delete("/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { deleted: true }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

module.exports = router;

router.get("/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
});

router.put("/users/:id/ban", authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { banned: true },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to ban user" });
  }
}); 