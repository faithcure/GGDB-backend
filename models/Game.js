// backend/models/Game.js - Updated with enhanced bannerOverrides
const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  originalTitle: String,
  releaseDate: String,
  coverImage: String,
  bannerImage: String,  // Add this if not exists
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

  // Enhanced gallery schema
  gallery: [
    {
      url: String,
      title: String,
      artist: String,
      date: String,
      source: String,
      type: {
        type: String,
        enum: ["image", "video"],
        default: "image"
      },
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

  // 🆕 Enhanced bannerOverrides with featuredBackground
  bannerOverrides: {
    posterImage: String,           // Poster override
    trailerUrl: String,           // Trailer override
    featuredBackground: String,   // 🆕 Featured section background override
    coverImage: String,           // 🆕 Cover image override
    bannerImage: String,          // 🆕 Banner image override
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },

  // Data source tracking for better organization
  dataSource: {
    type: String,
    enum: ["manual", "rawg", "igdb"],
    default: "manual"
  },

  languages: {
    audio: [String],
    subtitles: [String],
    interface: [String],
    hasIGDBLanguageData: { type: Boolean, default: false },
    lastChecked: { type: Date },
    igdbGameId: { type: Number }
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

  // Enhanced crew list with roles array
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
      roles: [
        {
          name: { type: String, required: true },
          department: { type: String, required: true }
        }
      ],
      // Backward compatibility fields
      role: String,
      department: String,
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
GameSchema.index({ dataSource: 1 });
GameSchema.index({ "crewList.name": 1 });
GameSchema.index({ "crewList.userId": 1 });
GameSchema.index({ "crewList.roles.name": 1 });
GameSchema.index({ "crewList.roles.department": 1 });

// 🆕 Virtual for getting effective images (with override priority)
GameSchema.virtual('effectiveImages').get(function() {
  const images = {
    featuredBackground: this.bannerOverrides?.featuredBackground || this.bannerImage || this.getGalleryImage('landscape') || this.coverImage,
    poster: this.bannerOverrides?.posterImage || this.getGalleryImage('poster') || this.coverImage,
    cover: this.bannerOverrides?.coverImage || this.coverImage,
    banner: this.bannerOverrides?.bannerImage || this.bannerImage,
    trailer: this.bannerOverrides?.trailerUrl || this.trailerUrl || this.getGalleryVideo()
  };
  return images;
});

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
      const dept = crew.department || 'Other';
      if (!result[dept]) result[dept] = [];
      result[dept].push(crew);
    }
  });

  return result;
});

// 🆕 Instance method to get gallery image by type
GameSchema.methods.getGalleryImage = function(type = 'any') {
  if (!this.gallery || this.gallery.length === 0) return null;

  let filteredImages = this.gallery.filter(item =>
      item.type === 'image' || item.url?.match(/\.(jpg|jpeg|png|webp)$/i)
  );

  if (type === 'landscape') {
    const landscapeImages = filteredImages.filter(item =>
        item.meta?.some(m =>
            (m.label === 'Orientation' && m.value === 'Landscape') ||
            (m.label === 'Type' && ['Banner', 'Background', 'Screenshot'].includes(m.value))
        )
    );
    if (landscapeImages.length > 0) return landscapeImages[0].url;
  }

  if (type === 'poster') {
    const posterImages = filteredImages.filter(item =>
        item.meta?.some(m =>
            (m.label === 'Type' && ['Poster', 'Cover'].includes(m.value)) ||
            (m.label === 'Orientation' && m.value === 'Portrait')
        )
    );
    if (posterImages.length > 0) return posterImages[0].url;
  }

  // Return first available image as fallback
  return filteredImages.length > 0 ? filteredImages[0].url : null;
};

// 🆕 Instance method to get gallery video
GameSchema.methods.getGalleryVideo = function() {
  if (!this.gallery || this.gallery.length === 0) return null;

  const videos = this.gallery.filter(item =>
      item.type === 'video' ||
      item.url?.includes('youtube.com') ||
      item.url?.includes('youtu.be') ||
      item.url?.match(/\.(mp4|webm|ogg)$/i)
  );

  return videos.length > 0 ? videos[0].url : null;
};

// 🆕 Pre-save middleware to update bannerOverrides timestamps
GameSchema.pre('save', function(next) {
  // Update crewList timestamps and metadata
  if (this.isModified('crewList')) {
    this.crewList.forEach(crew => {
      if (!crew.createdAt) crew.createdAt = new Date();
      if (!crew.id) crew.id = Date.now().toString();
      crew.updatedAt = new Date();

      if (!crew.image && crew.name) {
        crew.image = `https://ui-avatars.com/api/?name=${encodeURIComponent(crew.name)}&background=random&color=fff&size=40`;
      }

      if (!crew.roles || !Array.isArray(crew.roles)) {
        crew.roles = [];
      }

      // Migration: Convert old role/department to new structure
      if (crew.role && crew.department && crew.roles.length === 0) {
        const roles = crew.role.split(' & ').map(r => r.trim());
        crew.roles = roles.map(roleName => ({
          name: roleName,
          department: crew.department
        }));
      }
    });

    this.crewMetadata = {
      lastUpdated: new Date(),
      contributorCount: this.crewList.length,
      registeredUserCount: this.crewList.filter(crew => crew.isRegisteredUser).length,
      lastUpdatedBy: this.crewMetadata?.lastUpdatedBy || null
    };
  }

  // 🆕 Update bannerOverrides timestamps
  if (this.isModified('bannerOverrides')) {
    if (!this.bannerOverrides) this.bannerOverrides = {};
    this.bannerOverrides.updatedAt = new Date();
    if (!this.bannerOverrides.createdAt) {
      this.bannerOverrides.createdAt = new Date();
    }
  }

  next();
});

// 🆕 Instance method to add contributor with roles
GameSchema.methods.addContributor = function(contributorData, userId = null) {
  const newContributor = {
    id: Date.now().toString(),
    name: contributorData.name,
    roles: contributorData.roles || [],
    image: contributorData.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributorData.name)}&background=random&color=fff&size=40`,
    isRegisteredUser: contributorData.isRegisteredUser || false,
    userId: contributorData.userId || null,
    bio: contributorData.bio || null,
    socialLinks: contributorData.socialLinks || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  this.crewList.push(newContributor);

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

// 🆕 Instance method to set featured background override
GameSchema.methods.setFeaturedBackground = function(imageUrl, userId = null) {
  if (!this.bannerOverrides) this.bannerOverrides = {};
  this.bannerOverrides.featuredBackground = imageUrl;
  this.bannerOverrides.updatedAt = new Date();

  if (userId) {
    this.crewMetadata.lastUpdatedBy = userId;
  }
};

// 🆕 Instance method to get effective featured background
GameSchema.methods.getEffectiveFeaturedBackground = function() {
  // Priority order:
  // 1. Admin override
  if (this.bannerOverrides?.featuredBackground) {
    return this.bannerOverrides.featuredBackground;
  }

  // 2. Banner image
  if (this.bannerImage) {
    return this.bannerImage;
  }

  // 3. Gallery landscape image
  const galleryImage = this.getGalleryImage('landscape');
  if (galleryImage) {
    return galleryImage;
  }

  // 4. Cover image fallback
  if (this.coverImage) {
    return this.coverImage;
  }

  // 5. Placeholder
  return "https://placehold.co/1920x1080?text=Featured+Game";
};

// 🆕 Static method to find games with banner overrides
GameSchema.statics.findWithBannerOverrides = function() {
  return this.find({
    $or: [
      { 'bannerOverrides.featuredBackground': { $exists: true, $ne: null, $ne: '' } },
      { 'bannerOverrides.posterImage': { $exists: true, $ne: null, $ne: '' } },
      { 'bannerOverrides.trailerUrl': { $exists: true, $ne: null, $ne: '' } }
    ]
  });
};

// 🆕 Static method to find games by data source
GameSchema.statics.findByDataSource = function(source) {
  return this.find({ dataSource: source });
};

// Existing static methods
GameSchema.statics.findByContributor = function(contributorName) {
  return this.find({
    "crewList.name": new RegExp(contributorName, 'i')
  });
};

GameSchema.statics.findByUserId = function(userId) {
  return this.find({
    "crewList.userId": userId
  });
};

GameSchema.statics.findByRole = function(roleName) {
  return this.find({
    $or: [
      { "crewList.roles.name": new RegExp(roleName, 'i') },
      { "crewList.role": new RegExp(roleName, 'i') }
    ]
  });
};

GameSchema.statics.findByDepartment = function(departmentName) {
  return this.find({
    $or: [
      { "crewList.roles.department": new RegExp(departmentName, 'i') },
      { "crewList.department": new RegExp(departmentName, 'i') }
    ]
  });
};

module.exports = mongoose.model("Games", GameSchema);