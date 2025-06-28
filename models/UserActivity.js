const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  activityType: {
    type: String,
    enum: [
      "like",
      "dislike",
      "progress",
      "plantoplay",
      "review",        // Reviews artık burada
      "achievement",   // YENİ: Başarım unlocked
      "session",       // YENİ: Oyun seansı
      "rating"         // YENİ: Oyun puanlaması
    ],
    required: true,
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
  },

  // ===== MEVCUT ALANLAR =====
  targetReviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
  },
  comment: String,
  rating: Number,
  spoiler: Boolean,
  progress: Number,

  // ===== YENİ: PERFORMANCE CACHE ALANLARI =====
  gameTitle: {
    type: String,
    default: ""
  },
  gameCover: {
    type: String,
    default: ""
  },
  gameGenres: [String], // ["Action", "RPG"]
  gamePlatforms: [String], // ["PC", "PlayStation"]

  // ===== YENİ: DETAYLI AKTİVİTE BİLGİLERİ =====
  sessionDuration: {
    type: Number,
    default: 0 // dakika cinsinden
  },
  platform: {
    type: String,
    default: "PC" // "PC", "PlayStation", "Xbox", "Mobile" vs
  },
  device: {
    type: String,
    default: "" // "Steam Deck", "PS5", "Xbox Series X"
  },

  // ===== YENİ: BAŞARIM BİLGİLERİ =====
  achievements: [{
    name: String,
    description: String,
    icon: String,
    rarity: String // "Common", "Rare", "Epic", "Legendary"
  }],

  // ===== YENİ: REVIEW DETAYLARI (Reviews özelliği buraya taşındı) =====
  reviewTitle: {
    type: String,
    default: ""
  },
  reviewText: {
    type: String,
    default: ""
  },
  reviewHelpful: {
    type: Number,
    default: 0
  },
  reviewRecommended: {
    type: Boolean,
    default: null
  },
  reviewImages: [String], // Screenshot'lar

  // ===== YENİ: OYUN DURUMU BİLGİLERİ =====
  completionTime: {
    type: Number,
    default: 0 // tamamlama süresi (saat)
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Normal", "Hard", "Extreme", ""],
    default: ""
  },
  playstyle: {
    type: String,
    enum: ["Casual", "Completionist", "Speedrun", "Challenge", ""],
    default: ""
  },

  // ===== YENİ: SOSYAL BİLGİLER =====
  shareWithFriends: {
    type: Boolean,
    default: true
  },
  visibility: {
    type: String,
    enum: ["public", "friends", "private"],
    default: "public"
  },

  // ===== YENİ: METADATA =====
  source: {
    type: String,
    enum: ["manual", "steam", "epic", "gog", "auto"],
    default: "manual"
  },
  ipAddress: String,
  userAgent: String,

  date: {
    type: Date,
    default: Date.now,
  },

  // ===== YENİ: GÜNCELLEME ZAMANI =====
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // createdAt ve updatedAt otomatik eklenir
});

// ===== INDEXES (Performance için) =====
userActivitySchema.index({ userId: 1, date: -1 });
userActivitySchema.index({ gameId: 1, activityType: 1 });
userActivitySchema.index({ userId: 1, activityType: 1 });
userActivitySchema.index({ date: -1 });

// ===== VIRTUAL FIELDS =====
userActivitySchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffTime / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return this.date.toLocaleDateString();
});

// ===== METHODS =====
userActivitySchema.methods.getActivityIcon = function() {
  const icons = {
    'like': '❤️',
    'dislike': '💔',
    'progress': '🎮',
    'plantoplay': '📌',
    'review': '✍️',
    'achievement': '🏆',
    'session': '⏱️',
    'rating': '⭐'
  };
  return icons[this.activityType] || '📝';
};

userActivitySchema.methods.getFormattedMessage = function() {
  const gameTitle = this.gameTitle || 'a game';
  const progress = this.progress || 0;

  switch(this.activityType) {
    case 'like':
      return `Liked "${gameTitle}"`;
    case 'dislike':
      return `Disliked "${gameTitle}"`;
    case 'progress':
      if (progress >= 100) return `🏆 Completed "${gameTitle}"`;
      if (progress > 0) return `🎮 ${progress}% progress in "${gameTitle}"`;
      return `🎯 Started playing "${gameTitle}"`;
    case 'plantoplay':
      return `📌 Added "${gameTitle}" to wishlist`;
    case 'review':
      return `✍️ Reviewed "${gameTitle}"`;
    case 'achievement':
      return `🏆 Unlocked achievement in "${gameTitle}"`;
    case 'session':
      const duration = this.sessionDuration || 0;
      return `⏱️ Played "${gameTitle}" for ${duration} minutes`;
    case 'rating':
      return `⭐ Rated "${gameTitle}" ${this.rating}/10`;
    default:
      return `Activity in "${gameTitle}"`;
  }
};

module.exports = mongoose.model("UserActivity", userActivitySchema);