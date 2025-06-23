const UserActivity = require("../models/UserActivity");

// Like ekle/çıkar (toggle)
exports.toggleLike = async (req, res) => {
  const userId = req.user.id;
  const { gameId } = req.body;

  try {
    const filter = { userId, gameId, activityType: "like" };
    const existing = await UserActivity.findOne(filter);
    if (existing) {
      await UserActivity.deleteOne({ _id: existing._id }); // Varsa kaldır
      return res.json({ liked: false });
    } else {
      // Önce dislike varsa onu da kaldır
      await UserActivity.deleteOne({ userId, gameId, activityType: "dislike" });
      await UserActivity.create(filter); // Yoksa ekle
      return res.json({ liked: true });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle like" });
  }
};
// userActivityController.js dosyasına eklenecek fonksiyonlar

// Oyun için liked sayısı
exports.getLikedCount = async (req, res) => {
  try {
    const { gameId } = req.params;
    const count = await UserActivity.countDocuments({
      gameId,
      activityType: "like"
    });
    res.json({ count });
  } catch (err) {
    console.error("Failed to get liked count:", err);
    res.status(500).json({ error: "Failed to get liked count" });
  }
};

// Oyun için disliked sayısı
exports.getDislikedCount = async (req, res) => {
  try {
    const { gameId } = req.params;
    const count = await UserActivity.countDocuments({
      gameId,
      activityType: "dislike"
    });
    res.json({ count });
  } catch (err) {
    console.error("Failed to get disliked count:", err);
    res.status(500).json({ error: "Failed to get disliked count" });
  }
};

// Oyun için plan to play sayısı
exports.getPlanToPlayCount = async (req, res) => {
  try {
    const { gameId } = req.params;
    const count = await UserActivity.countDocuments({
      gameId,
      activityType: "plantoplay"
    });
    res.json({ count });
  } catch (err) {
    console.error("Failed to get plan to play count:", err);
    res.status(500).json({ error: "Failed to get plan to play count" });
  }
};

// Oyun için completed sayısı (progress >= 100 olanlar)
exports.getCompletedCount = async (req, res) => {
  try {
    const { gameId } = req.params;
    const count = await UserActivity.countDocuments({
      gameId,
      activityType: "progress",
      progress: { $gte: 100 }
    });
    res.json({ count });
  } catch (err) {
    console.error("Failed to get completed count:", err);
    res.status(500).json({ error: "Failed to get completed count" });
  }
};

// Tüm istatistikleri tek seferde getiren optimized version
exports.getGameStats = async (req, res) => {
  try {
    const { gameId } = req.params;

    // Paralel olarak tüm istatistikleri çek
    const [likedCount, dislikedCount, planToPlayCount, completedCount] = await Promise.all([
      UserActivity.countDocuments({ gameId, activityType: "like" }),
      UserActivity.countDocuments({ gameId, activityType: "dislike" }),
      UserActivity.countDocuments({ gameId, activityType: "plantoplay" }),
      UserActivity.countDocuments({ gameId, activityType: "progress", progress: { $gte: 100 } })
    ]);

    res.json({
      liked: likedCount,
      disliked: dislikedCount,
      planToPlay: planToPlayCount,
      completed: completedCount,
      total: likedCount + dislikedCount + planToPlayCount + completedCount
    });
  } catch (err) {
    console.error("Failed to get game stats:", err);
    res.status(500).json({ error: "Failed to get game stats" });
  }
};
// Dislike ekle/çıkar (toggle)
exports.toggleDislike = async (req, res) => {
  const userId = req.user.id;
  const { gameId } = req.body;

  try {
    const filter = { userId, gameId, activityType: "dislike" };
    const existing = await UserActivity.findOne(filter);
    if (existing) {
      await UserActivity.deleteOne({ _id: existing._id }); // Varsa kaldır
      return res.json({ disliked: false });
    } else {
      // Önce like varsa onu da kaldır
      await UserActivity.deleteOne({ userId, gameId, activityType: "like" });
      await UserActivity.create(filter); // Yoksa ekle
      return res.json({ disliked: true });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle dislike" });
  }
};

// Progress kaydet/güncelle (tek kayıt)
exports.saveProgress = async (req, res) => {
  try {
    const { gameId, progress } = req.body;
    const userId = req.user.id; // Auth'dan geliyor

    // UserActivity modeline kaydet veya güncelle
    let activity = await UserActivity.findOneAndUpdate(
      { userId, gameId, activityType: "progress" },
      { progress, activityType: "progress", date: new Date() },
      { upsert: true, new: true }
    );
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: "Progress save failed" });
  }
};

// Progress oku (son kayıt)
exports.getLastProgress = async (req, res) => {
  const { userId, gameId } = req.params;
  try {
    const last = await UserActivity.findOne({
      userId,
      gameId,
      activityType: "progress"
    }).sort({ date: -1 });
    res.json({ progress: last ? last.progress : 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
};
// Plan To Play ekle/çıkar (toggle)
exports.togglePlanToPlay = async (req, res) => {
  const userId = req.user.id;
  const { gameId } = req.body;

  try {
    const filter = { userId, gameId, activityType: "plantoplay" };
    const existing = await UserActivity.findOne(filter);
    if (existing) {
      await UserActivity.deleteOne({ _id: existing._id }); // Varsa kaldır
      return res.json({ plantoplay: false });
    } else {
      await UserActivity.create(filter); // Yoksa ekle
      return res.json({ plantoplay: true });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle plan to play" });
  }
};

// Plan to play status oku
exports.getPlanToPlayStatus = async (req, res) => {
  const { userId, gameId } = req.params;
  try {
    const plan = await UserActivity.findOne({ userId, gameId, activityType: "plantoplay" });
    res.json({ plantoplay: !!plan });
  } catch (err) {
    res.status(500).json({ error: "Failed to get plan to play status" });
  }
};

// Like status oku
exports.getLikeStatus = async (req, res) => {
  const { userId, gameId } = req.params;
  try {
    const like = await UserActivity.findOne({ userId, gameId, activityType: "like" });
    res.json({ liked: !!like });
  } catch (err) {
    res.status(500).json({ error: "Failed to get like status" });
  }
};

// Dislike status oku
exports.getDislikeStatus = async (req, res) => {
  const { userId, gameId } = req.params;
  try {
    const dislike = await UserActivity.findOne({ userId, gameId, activityType: "dislike" });
    res.json({ disliked: !!dislike });
  } catch (err) {
    res.status(500).json({ error: "Failed to get dislike status" });
  }
};

// (isteğe bağlı) Tüm user aktivitelerini getir
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const activity = await UserActivity.find({ userId }).sort({ date: -1 });
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user activity" });
  }
};
