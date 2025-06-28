const express = require("express");
const { getReviews, addReview, voteReview, deleteReview, searchReviews } = require("../controllers/reviewController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

// 🆕 Search reviews - MUST be before /:gameId route
router.get("/search", searchReviews);                       // /api/reviews/search?q=query

router.get("/:gameId", getReviews);                          // /api/reviews/:gameId?limit=3
router.post("/:gameId", authMiddleware, addReview);          // /api/reviews/:gameId
router.patch("/:reviewId/vote", authMiddleware, voteReview); // /api/reviews/:reviewId/vote
router.delete("/:reviewId", authMiddleware, deleteReview);   // /api/reviews/:reviewId

module.exports = router;
