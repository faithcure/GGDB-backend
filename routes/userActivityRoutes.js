const express = require("express");
const {
  toggleLike,
  toggleDislike,
  getLikeStatus,
  getDislikeStatus,
  saveProgress,
  getLastProgress,
  getUserActivity
} = require("../controllers/userActivityController");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/like", authMiddleware, toggleLike);
router.post("/dislike", authMiddleware, toggleDislike);
router.get("/like/:userId/:gameId", authMiddleware, getLikeStatus);
router.get("/dislike/:userId/:gameId", authMiddleware, getDislikeStatus);
router.post("/progress", authMiddleware, saveProgress);
router.get("/progress/:userId/:gameId", authMiddleware, getLastProgress);
router.get("/:userId", getUserActivity);

module.exports = router;
