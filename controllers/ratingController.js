const Rating = require("../models/Rating");
const Game = require("../models/Game");
const User = require("../models/User");

// Kullanıcının mevcut puanı
exports.getUserRating = async (req, res) => {
  try {
    const rating = await Rating.findOne({
      gameId: req.params.gameId,
      userId: req.user.id
    });
    if (!rating) return res.status(204).send();
    res.json(rating);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Yeni puan verirse veya güncellerse
exports.submitRating = async (req, res) => {
  try {
    const { scores, reviewText, liked } = req.body;
    const { gameId } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const game = await Game.findById(gameId);

    if (!user || !game) {
      return res.status(404).json({ message: "User or Game not found" });
    }

    const safeScores = {
      music: scores?.music ?? 5,
      story: scores?.story ?? 5,
      gameplay: scores?.gameplay ?? 5,
      visuals: scores?.visuals ?? 5,
      bugs: scores?.bugs ?? 5,
      replayability: scores?.replayability ?? 5,
    };

    // Upsert: Var mı güncelle, yoksa oluştur
    const rating = await Rating.findOneAndUpdate(
      { gameId, userId },
      {
        gameId,
        gameTitle: game.title,      // ⭐️ oyun adı
        userId,
        username: user.username,    // ⭐️ kullanıcı adı
        scores: safeScores,
        reviewText,
        liked,
      },
      { upsert: true, new: true }
    );

    // Ortalama hesapla ve oyun dokümanına kaydet
    const allRatings = await Rating.find({ gameId });
    const categories = Object.keys(safeScores);
    let avg = {};
    categories.forEach((cat) => {
      avg[cat] = (
        allRatings.reduce((sum, r) => sum + (r.scores[cat] || 0), 0) / allRatings.length
      ).toFixed(2);
    });

    await Game.findByIdAndUpdate(gameId, { averageRating: avg });

    res.json({ rating, average: avg });
  } catch (err) {
    console.error("Rating submit error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Ortalama puan
exports.getAverageRating = async (req, res) => {
  try {
    const ratings = await Rating.find({ gameId: req.params.gameId });

    if (!ratings.length) {
      return res.json({
        average: {
          music: 5,
          story: 5,
          gameplay: 5,
          visuals: 5,
          bugs: 5,
          replayability: 5
        },
        total: 0
      });
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
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
