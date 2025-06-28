const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  getUserRating,
  submitRating,
  getAverageRating,
  getUserRatings
} = require("../controllers/ratingController");

router.get("/avg/:gameId", getAverageRating);
router.get("/user/:userId", authMiddleware, getUserRatings);
router.get("/:gameId", authMiddleware, getUserRating);
router.post("/:gameId", authMiddleware, submitRating);

module.exports = router;
