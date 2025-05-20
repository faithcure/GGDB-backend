const UserActivity = require("../models/UserActivity");

const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;

    const activity = await UserActivity.find({ userId })
      .populate("gameId", "title") // sadece başlık gelsin
      .populate("targetReviewId", "comment rating spoiler")
      .sort({ date: -1 });

    res.json(activity);
  } catch (err) {
    console.error("❌ Error fetching user activity:", err);
    res.status(500).json({ error: "Failed to fetch user activity" });
  }
};

module.exports = { getUserActivity };
