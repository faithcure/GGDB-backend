// 📁 models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username:   { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String, required: true },
  dob:        { type: String },
  country:    { type: String },
  role:       { type: String, enum: ["User", "Moderator", "Admin", "Premium"], default: "User" },
  banned:     { type: Boolean, default: false },
  deleted:    { type: Boolean, default: false },

  // ----- EKLENEN ALANLAR -----
  bio:        { type: String, default: "" },            // Kullanıcı biyografisi
  website:    { type: String, default: "" },            // Kişisel websitesi, portfolyo vs.
  avatar:     { type: String, default: "" },            // Profil resmi URL
  coverImage: { type: String, default: "" },            // Profil kapağı
  socials: [
    {
      platform: { type: String },                      // Ör: "Twitter"
      link:     { type: String },                      // Profil linki
      color:    { type: String, default: "#6B7280" }   // Renk kodu (opsiyonel)
    }
  ],
  userTypes: [{ type: String }],                       // ["gamer", "professional", "streamer"]
  roles: [
    { name: { type: String } }                         // Kullanıcının etiket(rol)/uzmanlık alanları
  ],
  title:      { type: String, default: "" },           // Profesyonel başlık (örn: "Lead Developer")
}, {
  timestamps: true,
});

module.exports = mongoose.model("User", userSchema);
