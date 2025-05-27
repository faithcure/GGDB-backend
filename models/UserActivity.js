const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  activityType: {
    type: String,
    enum: ["review", "like", "dislike", "progress", "plantoplay"], // progress eklendi
    required: true,
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Game",
  },
  targetReviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Review",
  },
  comment: String,
  rating: Number,
  spoiler: Boolean,
  progress: Number, 
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("UserActivity", userActivitySchema);
