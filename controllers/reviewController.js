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

    review.likedBy = (review.likedBy || []).filter(id => id && id.toString() !== userObjectId.toString());
    review.dislikedBy = (review.dislikedBy || []).filter(id => id && id.toString() !== userObjectId.toString());


    if (voteType === "like") {
      review.likedBy.push(userObjectId);
    } else if (voteType === "dislike") {
      review.dislikedBy.push(userObjectId);
    }

    await review.save();

    res.json({
      likes: review.likedBy.length,
      dislikes: review.dislikedBy.length,
      userVote: voteType
    });
  } catch (err) {
    console.error("\u274C Failed to vote on review:", err);
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
      .lean(); // ObjectId yerine düz veri döner

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
// POST /api/reviews/:gameId
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

    // 🟡 Burada etkinlik olarak kaydediyoruz:
    const userActivity = new UserActivity({
      userId: req.userId || "000000000000000000000000", // Gerçek kullanıcı ID'si JWT ile eklenirse değiştir
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