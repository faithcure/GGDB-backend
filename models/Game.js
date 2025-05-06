// backend/models/Game.js
const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  title: String,
  originalTitle: String,
  releaseDate: String,
  coverImage: String,
  trailerUrl: String,
  tags: [String],
  director: String,
  studio: String,
  cast: [String],
  soundtrack: String,
  story: String,
  engine: String,
  franchise: String,
  genres: [String],
  platforms: [String],
  languages: {
    subtitles: [String],
    audio: [String],
    interface: [String],
  },
  whereToBuy: [
    {
      name: String,
      url: String,
    },
  ],
  crew: [String],
  contentWarnings: [String],
  ageRatings: [String],
  gallery: [String],
}, { timestamps: true });

module.exports = mongoose.model("Game", GameSchema);
