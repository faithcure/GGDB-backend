const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  user: String,
  comment: String,
  rating: Number,
  spoiler: Boolean,
  date: { type: Date, default: Date.now },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
});


module.exports = mongoose.model("Review", reviewSchema);
