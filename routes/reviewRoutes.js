const express = require("express");
const { getReviews, addReview } = require("../controllers/reviewController");

const router = express.Router();

router.get("/:gameId", getReviews);       // /api/reviews/:gameId?limit=3
router.post("/:gameId", addReview);       // /api/reviews/:gameId

module.exports = router;
