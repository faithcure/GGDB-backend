const Review = require("../models/Review");
const UserActivity = require("../models/UserActivity");
const mongoose = require("mongoose");

const voteReview = async (req, res) => {
  const { reviewId } = req.params;
  const { voteType } = req.body;
  const userId = req.user?.id || req.user?._id;

  if (!userId) return res.status(401).json({ error: "Unauthorized user" });

  try {
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ error: "Review not found" });

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const alreadyLiked = review.likedBy?.some(id => id.toString() === userObjectId.toString());
    const alreadyDisliked = review.dislikedBy?.some(id => id.toString() === userObjectId.toString());

    // 👍 Like
    if (voteType === "like") {
      if (alreadyLiked) {
        // Kaldır
        review.likedBy = review.likedBy.filter(id => id.toString() !== userObjectId.toString());
      } else {
        // Dislike varsa kaldır, sonra like ekle
        review.dislikedBy = review.dislikedBy.filter(id => id.toString() !== userObjectId.toString());
        review.likedBy.push(userObjectId);
      }
    }

    // 👎 Dislike
    else if (voteType === "dislike") {
      if (alreadyDisliked) {
        review.dislikedBy = review.dislikedBy.filter(id => id.toString() !== userObjectId.toString());
      } else {
        review.likedBy = review.likedBy.filter(id => id.toString() !== userObjectId.toString());
        review.dislikedBy.push(userObjectId);
      }
    }

    await review.save();

    res.json({
      likes: review.likedBy.length,
      dislikes: review.dislikedBy.length,
      userVote: voteType === "like"
        ? (alreadyLiked ? null : "like")
        : voteType === "dislike"
          ? (alreadyDisliked ? null : "dislike")
          : null
    });
  } catch (err) {
    console.error("❌ Failed to vote on review:", err);
    res.status(500).json({ error: "Failed to vote" });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    await Review.findByIdAndDelete(reviewId);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to delete review:", err);
    res.status(500).json({ error: "Delete failed" });
  }
};

const getReviews = async (req, res) => {
  try {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit) || 0;

    const reviews = await Review.find({ gameId })
      .sort({ date: -1 })
      .limit(limit)
      .lean();

    const updated = reviews.map(r => ({
      ...r,
      likes: r.likedBy?.length || 0,
      dislikes: r.dislikedBy?.length || 0,
      likedBy: r.likedBy || [],
      dislikedBy: r.dislikedBy || []
    }));

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

const addReview = async (req, res) => {
  try {
    const { gameId } = req.params;
    const { user, comment, rating, spoiler } = req.body;

    const newReview = new Review({
      gameId,
      user,
      comment,
      rating,
      spoiler,
    });

    await newReview.save();

    const userActivity = new UserActivity({
      userId: req.userId || "000000000000000000000000",
      activityType: "review",
      gameId,
      targetReviewId: newReview._id,
      comment,
      rating,
      spoiler,
    });

    await userActivity.save();

    res.status(201).json(newReview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to submit review" });
  }
};

module.exports = { getReviews, addReview, voteReview, deleteReview };
