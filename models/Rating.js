const mongoose = require("mongoose");

const RatingSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  gameTitle: { type: String, required: true },         // ⭐️ EKLENDİ
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },           // ⭐️ EKLENDİ
  scores: {
    music: { type: Number, min: 0, max: 10 },
    story: { type: Number, min: 0, max: 10 },
    gameplay: { type: Number, min: 0, max: 10 },
    visuals: { type: Number, min: 0, max: 10 },
    bugs: { type: Number, min: 0, max: 10 },
    replayability: { type: Number, min: 0, max: 10 },
  },
  avarageScore: { type: Number, min: 0, max: 10, default: 0 },
  reviewText: { type: String, default: "" },
  liked: { type: Boolean, default: null },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model("Rating", RatingSchema);
