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
    posterImage: String,
    trailerUrl: String,
  },
  languages: {
    audio: [String],
    subtitles: [String],
    interface: [String],
  },
  ggdbRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
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

  // 🆕 ENHANCED: Structured crew list with roles array
  crewList: [
    {
      id: {
        type: String,
        required: true,
        default: function() {
          return Date.now().toString();
        }
      },
      name: { type: String, required: true },

      // 🆕 NEW STRUCTURE: Multiple roles with departments
      roles: [
        {
          name: { type: String, required: true },        // e.g., "VFX Artist"
          department: { type: String, required: true }   // e.g., "Art"
        }
      ],

      // 🔧 DEPRECATED: Keep for backward compatibility during migration
      role: String,          // Will be removed after migration
      department: String,    // Will be removed after migration

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
      },
      bio: String,
      socialLinks: [
        {
          platform: String,
          url: String
        }
      ],
      credits: [String],
      verified: { type: Boolean, default: false },
      visibility: {
        type: String,
        enum: ["public", "private", "contributors_only"],
        default: "public"
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }
  ],

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
      helpful: { type: Number, default: 0 },
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

// 🆕 Indexes for better performance
GameSchema.index({ title: 1 });
GameSchema.index({ genres: 1 });
GameSchema.index({ ggdbRating: -1 });
GameSchema.index({ "crewList.name": 1 });
GameSchema.index({ "crewList.userId": 1 });
GameSchema.index({ "crewList.roles.name": 1 });
GameSchema.index({ "crewList.roles.department": 1 });

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
  return Math.round((sum / this.reviews.length) * 10) / 10;
});

// 🆕 Virtual for crew by department
GameSchema.virtual('crewByDepartment').get(function() {
  if (!this.crewList) return {};

  const result = {};
  this.crewList.forEach(crew => {
    if (crew.roles && crew.roles.length > 0) {
      // 🆕 NEW: Use roles array
      crew.roles.forEach(role => {
        const dept = role.department || 'Other';
        if (!result[dept]) result[dept] = [];
        result[dept].push({
          ...crew.toObject(),
          currentRole: role.name,
          currentDepartment: role.department
        });
      });
    } else {
      // 🔧 BACKWARD COMPATIBILITY: Use old role/department
      const dept = crew.department || 'Other';
      if (!result[dept]) result[dept] = [];
      result[dept].push(crew);
    }
  });

  return result;
});

// 🆕 Pre-save middleware to update crewList timestamps and metadata
GameSchema.pre('save', function(next) {
  if (this.isModified('crewList')) {
    this.crewList.forEach(crew => {
      if (!crew.createdAt) crew.createdAt = new Date();
      if (!crew.id) crew.id = Date.now().toString();
      crew.updatedAt = new Date();

      // Set default image if none provided
      if (!crew.image && crew.name) {
        crew.image = `https://ui-avatars.com/api/?name=${encodeURIComponent(crew.name)}&background=random&color=fff&size=40`;
      }

      // 🆕 Ensure roles array exists
      if (!crew.roles || !Array.isArray(crew.roles)) {
        crew.roles = [];
      }

      // 🔧 MIGRATION: Convert old role/department to new structure
      if (crew.role && crew.department && crew.roles.length === 0) {
        const roles = crew.role.split(' & ').map(r => r.trim());
        crew.roles = roles.map(roleName => ({
          name: roleName,
          department: crew.department
        }));
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

// 🆕 Instance method to add contributor with roles
GameSchema.methods.addContributor = function(contributorData, userId = null) {
  const newContributor = {
    id: Date.now().toString(),
    name: contributorData.name,
    roles: contributorData.roles || [],  // 🆕 Roles array
    image: contributorData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributorData.name)}&background=random&color=fff&size=40`,
    isRegisteredUser: contributorData.isRegisteredUser || false,
    userId: contributorData.userId || null,
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

// 🆕 Static method to find games by role
GameSchema.statics.findByRole = function(roleName) {
  return this.find({
    $or: [
      { "crewList.roles.name": new RegExp(roleName, 'i') },
      { "crewList.role": new RegExp(roleName, 'i') }  // Backward compatibility
    ]
  });
};

// 🆕 Static method to find games by department
GameSchema.statics.findByDepartment = function(departmentName) {
  return this.find({
    $or: [
      { "crewList.roles.department": new RegExp(departmentName, 'i') },
      { "crewList.department": new RegExp(departmentName, 'i') }  // Backward compatibility
    ]
  });
};

module.exports = mongoose.model("Games", GameSchema);