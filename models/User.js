// 📁 models/User.js - Enhanced with professional fields
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

  // ----- PROFIL ALANLARI -----
  bio:        { type: String, default: "", maxlength: 500 },
  website:    { type: String, default: "" },
  avatar:     { type: String, default: "" },
  coverImage: { type: String, default: "" },
  title:      { type: String, default: "" },

  // ----- YENİ PROFESYONEL ALANLAR -----
  education: {
    type: String,
    default: "",
    maxlength: 200,
    trim: true
  },
  currentWork: {
    type: String,
    default: "",
    maxlength: 200,
    trim: true
  },
  currentProjects: {
    type: String,
    default: "",
    maxlength: 300,
    trim: true
  },
  careerGoals: {
    type: String,
    default: "",
    maxlength: 250,
    trim: true
  },

  // ----- SOSYAL MEDYA LINKLERI -----
  socials: [
    {
      platform: { type: String },
      link:     { type: String },
      color:    { type: String, default: "#6B7280" }
    }
  ],

  // ----- KULLANICI TİPLERİ VE ROLLERİ -----
  userTypes: [{ type: String }],
  roles: [
    { name: { type: String } }
  ],

  // ----- GAMİNG PLATFORMLARI -----
  platforms: [
    {
      key: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      },
      verified: {
        type: Boolean,
        default: false
      },
      username: {
        type: String,
        trim: true,
        default: ""
      },
      profileUrl: {
        type: String,
        default: ""
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // ----- FAVORİ TÜRLER -----
  favoriteGenres: [
    {
      name: { type: String, required: true },      // Genre ismi
      key: { type: String },                       // Genre anahtarı
      color: { type: String, default: "#8B5CF6" }, // Renk kodu
      percentage: { type: Number, default: 0 }     // Oynama yüzdesi (opsiyonel)
    }
  ],

  // ----- FAVORİ KONSOLLAR -----
  favoriteConsoles: [
    {
      name: { type: String, required: true },      // Konsol ismi
      key: { type: String, required: true },       // Konsol anahtarı
      generation: { type: String },                // Nesil bilgisi (opsiyonel)
      addedAt: { type: Date, default: Date.now }   // Ne zaman eklendi
    }
  ],

  // ----- OYUN İSTATİSTİKLERİ -----
  gameStats: {
    totalGames: { type: Number, default: 0 },
    favoriteGenres: [{ type: String }],           // Deprecated - favoriteGenres kullan
    totalPlaytime: { type: Number, default: 0 },
    achievementCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
});

// Validasyonlar
userSchema.pre('save', function(next) {
  // Platform sayısı kontrolü
  if (this.platforms && this.platforms.length > 10) {
    const error = new Error('Maximum 10 platforms allowed');
    error.name = 'ValidationError';
    return next(error);
  }

  // Genre sayısı kontrolü
  if (this.favoriteGenres && this.favoriteGenres.length > 15) {
    const error = new Error('Maximum 15 genres allowed');
    error.name = 'ValidationError';
    return next(error);
  }

  // Konsol sayısı kontrolü
  if (this.favoriteConsoles && this.favoriteConsoles.length > 20) {
    const error = new Error('Maximum 20 consoles allowed');
    error.name = 'ValidationError';
    return next(error);
  }

  // Bio karakter limiti kontrolü
  if (this.bio && this.bio.length > 500) {
    const error = new Error('Bio cannot exceed 500 characters');
    error.name = 'ValidationError';
    return next(error);
  }

  // Eğitim karakter limiti kontrolü
  if (this.education && this.education.length > 200) {
    const error = new Error('Education cannot exceed 200 characters');
    error.name = 'ValidationError';
    return next(error);
  }

  // Mevcut iş karakter limiti kontrolü
  if (this.currentWork && this.currentWork.length > 200) {
    const error = new Error('Current work cannot exceed 200 characters');
    error.name = 'ValidationError';
    return next(error);
  }

  // Mevcut projeler karakter limiti kontrolü
  if (this.currentProjects && this.currentProjects.length > 300) {
    const error = new Error('Current projects cannot exceed 300 characters');
    error.name = 'ValidationError';
    return next(error);
  }

  // Kariyer hedefleri karakter limiti kontrolü
  if (this.careerGoals && this.careerGoals.length > 250) {
    const error = new Error('Career goals cannot exceed 250 characters');
    error.name = 'ValidationError';
    return next(error);
  }

  next();
});



// Index'ler
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'platforms.key': 1 });
userSchema.index({ 'favoriteGenres.key': 1 });
userSchema.index({ 'favoriteConsoles.key': 1 });

module.exports = mongoose.model("User", userSchema);