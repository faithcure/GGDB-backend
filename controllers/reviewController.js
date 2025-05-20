const Review = require("../models/Review");
const UserActivity = require("../models/UserActivity");

// GET /api/reviews/:gameId?limit=3
const getReviews = async (req, res) => {
  try {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit) || 0;

    const reviews = await Review.find({ gameId })
      .sort({ date: -1 })
      .limit(limit);

    res.json(reviews);
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


module.exports = { getReviews, addReview };
