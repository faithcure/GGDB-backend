// backend/models/Game.js
const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  title: { type: String, required: true },
  originalTitle: String,
  releaseDate: String, // İsteğe bağlı: Date olarak da tutulabilir
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
  whereToBuy: [
    {
      name: String,
      url: String,
    },
  ],
  crew: [String], // daha detaylı bir yapı istenirse ileride ayrı bir schema olarak ayrılabilir
  awards: [String],
  metacriticScore: Number,
  userRating: Number,
  playtime: Number, // ortalama oynanma süresi (saat)
  steamLink: String,
  website: String,
  price: Number,
  // Opsiyonel: Dökümantasyon için ileride kullanılabilir
  systemRequirements: {
    minimum: String,
    recommended: String,
  },
}, { timestamps: true });

module.exports = mongoose.model("Game", GameSchema);
