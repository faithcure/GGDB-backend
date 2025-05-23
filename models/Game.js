// backend/models/Game.js
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
  gallery: [String],
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
}, { timestamps: true });

module.exports = mongoose.model("Game", GameSchema);