const express = require("express");
const {
  toggleLike,
  toggleDislike,
  getLikeStatus,
  getDislikeStatus,
  saveProgress,
  getLastProgress,
  getUserActivity,
  togglePlanToPlay,
  getPlanToPlayStatus,
  // YENİ: İstatistik fonksiyonlarını ekleyin
  getLikedCount,
  getDislikedCount,
  getPlanToPlayCount,
  getCompletedCount,
  getGameStats
} = require("../controllers/userActivityController");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

// Mevcut route'larınız
router.post("/like", authMiddleware, toggleLike);
router.post("/dislike", authMiddleware, toggleDislike);
router.get("/like/:userId/:gameId", authMiddleware, getLikeStatus);
router.get("/dislike/:userId/:gameId", authMiddleware, getDislikeStatus);
router.post("/progress", authMiddleware, saveProgress);
router.get("/progress/:userId/:gameId", authMiddleware, getLastProgress);
router.get("/:userId", getUserActivity);
router.post("/plantoplay", authMiddleware, togglePlanToPlay);
router.get("/plantoplay/:userId/:gameId", authMiddleware, getPlanToPlayStatus);

// 🆕 YENİ EKLENEN: Topluluk istatistikleri route'ları
router.get('/stats/liked/:gameId', getLikedCount);
router.get('/stats/disliked/:gameId', getDislikedCount);
router.get('/stats/plantoplay/:gameId', getPlanToPlayCount);
router.get('/stats/completed/:gameId', getCompletedCount);
router.get('/stats/all/:gameId', getGameStats);

module.exports = router;