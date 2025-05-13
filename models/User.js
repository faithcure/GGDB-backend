// 📁 models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  dob: { type: String },
  country: { type: String },
  role: { type: String, enum: ["User", "Moderator", "Admin", "Premium"], default: "User" },
  banned: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false }
}, {
  timestamps: true,
});

module.exports = mongoose.model("User", userSchema);
