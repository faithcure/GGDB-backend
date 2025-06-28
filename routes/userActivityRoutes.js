const express = require("express");
const {
  // ===== ENHANCED EXISTING FUNCTIONS =====
  toggleLike,
  toggleDislike,
  getLikeStatus,
  getDislikeStatus,
  saveProgress,
  getLastProgress,
  getUserActivity,
  togglePlanToPlay,
  getPlanToPlayStatus,

  // ===== NEW ACTIVITY FUNCTIONS =====
  addReviewActivity,
  addAchievementActivity,
  addSessionActivity,

  // ===== STATISTICS FUNCTIONS =====
  getLikedCount,
  getDislikedCount,
  getPlanToPlayCount,
  getCompletedCount,
  getGameStats
} = require("../controllers/userActivityController");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

// ===== MAIN ACTIVITY ROUTES =====

// Get user activities (with enhanced filtering)
// Supports query params: ?limit=50&type=all&timeRange=all
router.get("/:userId", authMiddleware, getUserActivity);

// ===== LIKE/DISLIKE ROUTES =====
router.post("/like", authMiddleware, toggleLike);
router.post("/dislike", authMiddleware, toggleDislike);
router.get("/like/:userId/:gameId", authMiddleware, getLikeStatus);
router.get("/dislike/:userId/:gameId", authMiddleware, getDislikeStatus);

// ===== PROGRESS ROUTES =====
router.post("/progress", authMiddleware, saveProgress);
router.get("/progress/:userId/:gameId", authMiddleware, getLastProgress);

// ===== PLAN TO PLAY ROUTES =====
router.post("/plantoplay", authMiddleware, togglePlanToPlay);
router.get("/plantoplay/:userId/:gameId", authMiddleware, getPlanToPlayStatus);

// ===== 🆕 NEW: REVIEW ACTIVITY ROUTES =====
router.post("/review", authMiddleware, addReviewActivity);

// ===== 🆕 NEW: ACHIEVEMENT ACTIVITY ROUTES =====
router.post("/achievement", authMiddleware, addAchievementActivity);

// ===== 🆕 NEW: SESSION ACTIVITY ROUTES =====
router.post("/session", authMiddleware, addSessionActivity);

// ===== STATISTICS ROUTES =====
router.get('/stats/liked/:gameId', getLikedCount);
router.get('/stats/disliked/:gameId', getDislikedCount);
router.get('/stats/plantoplay/:gameId', getPlanToPlayCount);
router.get('/stats/completed/:gameId', getCompletedCount);
router.get('/stats/all/:gameId', getGameStats);

module.exports = router;