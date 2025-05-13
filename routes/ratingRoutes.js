const express = require("express");
const router = express.Router();
const Rating = require("../models/Rating");
const auth = require("../middleware/authMiddleware");

const DEFAULT_SCORES = {
  music: 5,
  story: 5,
  gameplay: 5,
  visuals: 5,
  bugs: 5,
  replayability: 5,
};

// 📌 Get average rating for a game
router.get("/avg/:gameId", async (req, res) => {
  const ratings = await Rating.find({ gameId: req.params.gameId });

  // Oy yoksa boş ortalama döndür (null değil!)
  if (!ratings.length) {
    return res.json({ average: { ...DEFAULT_SCORES }, total: 0 });
  }

  const avg = { ...DEFAULT_SCORES };
  ratings.forEach(r => {
    Object.keys(avg).forEach(key => {
      avg[key] += r.scores?.[key] || 0;
    });
  });

  const total = ratings.length;
  Object.keys(avg).forEach(key => {
    avg[key] = parseFloat((avg[key] / total).toFixed(1));
  });

  res.json({ average: avg, total });
});

// 📌 Get current user's rating (for edit form)
router.get("/:gameId", auth, async (req, res) => {
  const rating = await Rating.findOne({ gameId: req.params.gameId, userId: req.user.id });
  if (!rating) return res.status(204).send();

  // ✅ Eksik scores alanlarını tamamla
  const completeScores = { ...DEFAULT_SCORES, ...rating.scores };
  res.json({ ...rating.toObject(), scores: completeScores });
});

// 📌 Add or update user's rating
router.post("/:gameId", auth, async (req, res) => {
  const { scores } = req.body;
  const { gameId } = req.params;
  const userId = req.user.id;

  const safeScores = { ...DEFAULT_SCORES, ...scores };

  const existing = await Rating.findOne({ gameId, userId });
  if (existing) {
    existing.scores = safeScores;
    await existing.save();
    return res.json({ ...existing.toObject(), scores: safeScores });
  }

  const newRating = await Rating.create({ gameId, userId, scores: safeScores });
  res.json({ ...newRating.toObject(), scores: safeScores });
});

module.exports = router;
