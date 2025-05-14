const Rating = require("../models/Rating");

// Kullanıcının mevcut puanı
exports.getUserRating = async (req, res) => {
  const rating = await Rating.findOne({ gameId: req.params.gameId, userId: req.user.id });
  if (!rating) return res.status(204).send();

  res.json(rating);
};

// Yeni puan verirse veya güncellerse
exports.submitRating = async (req, res) => {
  const { scores, reviewText, liked } = req.body;
  const { gameId } = req.params;
  const userId = req.user.id;

  const safeScores = {
    music: scores?.music ?? 5,
    story: scores?.story ?? 5,
    gameplay: scores?.gameplay ?? 5,
    visuals: scores?.visuals ?? 5,
    bugs: scores?.bugs ?? 5,
    replayability: scores?.replayability ?? 5,
  };

  const existing = await Rating.findOne({ gameId, userId });
  if (existing) {
    existing.scores = safeScores;
    if (reviewText !== undefined) existing.reviewText = reviewText;
    if (liked !== undefined) existing.liked = liked;
    await existing.save();
    return res.json(existing);
  }

  const newRating = await Rating.create({
    gameId,
    userId,
    scores: safeScores,
    reviewText,
    liked,
  });

  res.json(newRating);
};

// Ortalama puan
exports.getAverageRating = async (req, res) => {
  const ratings = await Rating.find({ gameId: req.params.gameId });

  if (!ratings.length) {
    return res.json({ average: {
      music: 5, story: 5, gameplay: 5,
      visuals: 5, bugs: 5, replayability: 5
    }, total: 0 });
  }

  const avg = {
    music: 0, story: 0, gameplay: 0,
    visuals: 0, bugs: 0, replayability: 0,
  };

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
};
