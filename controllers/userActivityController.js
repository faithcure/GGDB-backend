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
  const { gameId, progress } = req.body;
  const userId = req.user.id;

  try {
    const activity = await UserActivity.findOneAndUpdate(
      { userId, gameId, activityType: "progress" },
      { progress, date: new Date() },
      { new: true, upsert: true }
    );
    res.json(activity);
  } catch (err) {
    res.status(500).json({ error: "Failed to save progress" });
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
