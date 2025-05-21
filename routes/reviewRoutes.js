const express = require("express");
const { getReviews, addReview, voteReview, deleteReview } = require("../controllers/reviewController");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:gameId", getReviews);                          // /api/reviews/:gameId?limit=3
router.post("/:gameId", addReview);                          // /api/reviews/:gameId
router.patch("/:reviewId/vote", authMiddleware, voteReview); // /api/reviews/:reviewId/vote
router.delete("/:reviewId", authMiddleware, deleteReview);   // /api/reviews/:reviewId

module.exports = router;
