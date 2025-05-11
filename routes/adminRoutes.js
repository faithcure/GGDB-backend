const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ Tüm kullanıcıları getir (silinmiş dahil)
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// ✅ Tek bir kullanıcıyı ID ile getir
router.get("/users/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
});

// Ban routes
router.put("/users/:id/ban", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { banned: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Ban failed", error: err.message });
  }
});

// 🔄 Kullanıcıyı geri getir (ban kaldır + silme kaldır)
router.put("/users/:id/recover", authMiddleware, async (req, res) => {
  try {
    const recoveredUser = await User.findByIdAndUpdate(
      req.params.id,
      { banned: false, deleted: false },
      { new: true }
    );
    if (!recoveredUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User recovered successfully", user: recoveredUser });
  } catch (err) {
    res.status(500).json({ message: "Failed to recover user", error: err.message });
  }
});


// ✅ Kullanıcının rolünü güncelle
router.put("/users/:id/role", authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Role updated successfully", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Failed to update role", error: err.message });
  }
});

// ✅ Kullanıcıyı silinmiş olarak işaretle
router.delete("/users/:id", authMiddleware, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { deleted: true },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ message: "User marked as deleted", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
});

module.exports = router;
