// backend/models/Game.js - Updated with enhanced crewList schema
const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  originalTitle: String,
  releaseDate: String,
  coverImage: String,
  trailerUrl: String,
  tags: [String],
  genres: [String],
  platforms: [String],
  studio: String,
  developer: String,
  publisher: String,
  engine: String,
  franchise: String,
  director: String,
  composer: String,
  soundtrack: String,
  story: String,
  cast: [String],
  contentWarnings: [String],
  ageRatings: [String],
  gallery: [
    {
      url: String,
      title: String,
      artist: String,
      date: String,
      source: String,
      mediaType: String,
      edited: { type: Boolean, default: false },
      meta: [
        {
          label: String,
          value: String
        }
      ]
    }
  ],
  bannerOverrides: {
    posterImage: String,   // Admin panelinden değiştirilen poster url'si
    trailerUrl: String,    // Admin panelinden değiştirilen trailer/video url'si
  },
  languages: {
    audio: [String],
    subtitles: [String],
    interface: [String],
  },
  ggdbRating: { type: Number, default: 0 },    // ⭐️ GGDB puan ortalaması
  ratingCount: { type: Number, default: 0 },   // (opsiyonel) Toplam oy sayısı
  storeLinks: [
    {
      platform: String,
      url: String,
      type: {
        type: String,
        enum: ["digital", "physical"],
        default: "digital"
      }
    }
  ],
  crew: [String],
  // 🆕 ENHANCED: Structured crew list with detailed information
  crewList: [
    {
      id: {
        type: String,
        required: true,
        default: function() {
          return Date.now().toString();
        }
      }, // Unique identifier for frontend operations
      name: { type: String, required: true },
      role: { type: String, required: true },
      image: {
        type: String,
        default: function() {
          return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random&color=fff&size=40`;
        }
      },
      isRegisteredUser: { type: Boolean, default: false },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
      }, // Link to actual user if registered
      bio: String, // Optional biography
      socialLinks: [
        {
          platform: String,
          url: String
        }
      ],
      // 🆕 Additional fields for better contributor management
      department: String, // e.g., "Programming", "Art", "Design"
      credits: [String], // Additional game credits
      verified: { type: Boolean, default: false }, // Admin verified contributor
      visibility: {
        type: String,
        enum: ["public", "private", "contributors_only"],
        default: "public"
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }
  ],
  // 🆕 NEW: Reviews system
  reviews: [
    {
      user: { type: String, required: true },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      comment: { type: String, required: true },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      spoiler: { type: Boolean, default: false },
      helpful: { type: Number, default: 0 }, // Helpful votes
      date: { type: Date, default: Date.now }
    }
  ],
  awards: [
    {
      title: String,
      date: String,
      category: String,
      recipient: String
    }
  ],
  metacriticScore: Number,
  userRating: Number,
  mainPlaytime: Number,
  extrasPlaytime: Number,
  completionPlaytime: Number,
  //playtime: Number,
  steamLink: String,
  website: String,
  price: Number,
  dlcs: [String],
  inspiration: [String],
  officialWebsite: String,
  estimatedPlaytime: String,
  systemRequirements: {
    minimum: String,
    recommended: String,
  },
  // 🆕 Metadata for better crew management
  crewMetadata: {
    lastUpdated: { type: Date, default: Date.now },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    contributorCount: { type: Number, default: 0 },
    registeredUserCount: { type: Number, default: 0 }
  }
}, { timestamps: true });

// 🆕 Index for better performance
GameSchema.index({ title: 1 });
GameSchema.index({ genres: 1 });
GameSchema.index({ ggdbRating: -1 });
GameSchema.index({ "crewList.name": 1 });
GameSchema.index({ "crewList.userId": 1 });
GameSchema.index({ "crewList.role": 1 });
GameSchema.index({ "crewList.department": 1 });

// 🆕 Virtual for total crew count
GameSchema.virtual('totalCrewCount').get(function() {
  return this.crewList ? this.crewList.length : 0;
});

// 🆕 Virtual for registered crew count
GameSchema.virtual('registeredCrewCount').get(function() {
  return this.crewList ? this.crewList.filter(crew => crew.isRegisteredUser).length : 0;
});

// 🆕 Virtual for average review rating
GameSchema.virtual('averageReviewRating').get(function() {
  if (!this.reviews || this.reviews.length === 0) return 0;
  const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / this.reviews.length) * 10) / 10; // Round to 1 decimal
});

// 🆕 Virtual for crew by department
GameSchema.virtual('crewByDepartment').get(function() {
  if (!this.crewList) return {};

  return this.crewList.reduce((acc, crew) => {
    const dept = crew.department || 'Other';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(crew);
    return acc;
  }, {});
});

// 🆕 Pre-save middleware to update crewList timestamps and metadata
GameSchema.pre('save', function(next) {
  if (this.isModified('crewList')) {
    // Update individual crew timestamps
    this.crewList.forEach(crew => {
      if (!crew.createdAt) crew.createdAt = new Date();
      if (!crew.id) crew.id = Date.now().toString();
      crew.updatedAt = new Date();

      // Set default image if none provided
      if (!crew.image && crew.name) {
        crew.image = `https://ui-avatars.com/api/?name=${encodeURIComponent(crew.name)}&background=random&color=fff&size=40`;
      }
    });

    // Update metadata
    this.crewMetadata = {
      lastUpdated: new Date(),
      contributorCount: this.crewList.length,
      registeredUserCount: this.crewList.filter(crew => crew.isRegisteredUser).length,
      lastUpdatedBy: this.crewMetadata?.lastUpdatedBy || null
    };
  }
  next();
});

// 🆕 Instance method to add contributor
GameSchema.methods.addContributor = function(contributorData, userId = null) {
  const newContributor = {
    id: Date.now().toString(),
    name: contributorData.name,
    role: contributorData.role,
    image: contributorData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributorData.name)}&background=random&color=fff&size=40`,
    isRegisteredUser: contributorData.isRegisteredUser || false,
    userId: contributorData.userId || null,
    department: contributorData.department || null,
    bio: contributorData.bio || null,
    socialLinks: contributorData.socialLinks || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.crewList.push(newContributor);

  // Update metadata
  this.crewMetadata.lastUpdated = new Date();
  this.crewMetadata.lastUpdatedBy = userId;
  this.crewMetadata.contributorCount = this.crewList.length;
  this.crewMetadata.registeredUserCount = this.crewList.filter(c => c.isRegisteredUser).length;

  return newContributor;
};

// 🆕 Instance method to remove contributor
GameSchema.methods.removeContributor = function(contributorId, userId = null) {
  const initialLength = this.crewList.length;
  this.crewList = this.crewList.filter(crew => crew.id !== contributorId);

  if (this.crewList.length < initialLength) {
    // Update metadata
    this.crewMetadata.lastUpdated = new Date();
    this.crewMetadata.lastUpdatedBy = userId;
    this.crewMetadata.contributorCount = this.crewList.length;
    this.crewMetadata.registeredUserCount = this.crewList.filter(c => c.isRegisteredUser).length;
    return true;
  }
  return false;
};

// 🆕 Static method to find games by contributor
GameSchema.statics.findByContributor = function(contributorName) {
  return this.find({
    "crewList.name": new RegExp(contributorName, 'i')
  });
};

// 🆕 Static method to find games by user ID
GameSchema.statics.findByUserId = function(userId) {
  return this.find({
    "crewList.userId": userId
  });
};

module.exports = mongoose.model("Games", GameSchema);