// 📁 controllers/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// ✅ EMAIL CHECK
exports.checkEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const existing = await User.findOne({ email });
    res.json({ exists: !!existing });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ REGISTER
exports.register = async (req, res) => {
  const { username, dob, country, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email is already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username, dob, country, email, password: hashedPassword,
    });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        country: user.country,
        dob: user.dob,
        role: user.role,
      }
    });
  } catch (err) {
    console.error("Register error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        country: user.country,
        dob: user.dob,
        role: user.role,
      }
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ ME (kendi bilgilerini getir)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("GetMe error", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Kullanıcı kendi profilini günceller
exports.updateMe = async (req, res) => {
  try {
    // LOG: Hangi güncellemeler geliyor?
    console.log("updateMe gelen updates:", req.body);

    // Sadece modelde olan alanlara izin ver (süper güvenli!)
    const allowedFields = [
      "username", "title", "avatar", "bio", "website", "coverImage",
      "socials", "userTypes", "roles"
    ];
    let updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // "roles" sadece string array gelirse object array'e çevir
    if (Array.isArray(updates.roles) && typeof updates.roles[0] === "string") {
      updates.roles = updates.roles.map(r => ({ name: r }));
    }

    // Güncelle!
    const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        { new: true }
    ).select("-password");

    res.json(user);
  } catch (err) {
    console.error("updateMe error:", err); // ← detaylı hata burada!
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};
