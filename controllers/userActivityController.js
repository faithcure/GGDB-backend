const UserActivity = require("../models/UserActivity");
const Game = require("../models/Game");
const { updateGameStats, handleOppositeActivity } = require("../middleware/activityStatsMiddleware");

// ===== ENHANCED getUserActivity - Zenginleştirilmiş aktivite getirme =====
exports.getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, type = 'all', timeRange = 'all' } = req.query;

    console.log('🔍 Enhanced getUserActivity called for:', userId);
    console.log('📊 Query params:', { limit, type, timeRange });

    // Build query filter
    let filter = { userId };

    // Activity type filter
    if (type && type !== 'all') {
      filter.activityType = type;
    }

    // Time range filter
    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      let dateFilter;

      switch (timeRange) {
        case 'today':
          dateFilter = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      if (dateFilter) {
        filter.date = { $gte: dateFilter };
      }
    }

    // Fetch activities with enhanced data
    const activities = await UserActivity.find(filter)
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .lean(); // Use lean() for better performance

    console.log(`✅ Found ${activities.length} activities`);

    // Enrich activities with missing game data
    const enrichedActivities = await Promise.all(
        activities.map(async (activity) => {
          // If game data is not cached in activity, fetch it
          if (!activity.gameTitle && activity.gameId) {
            try {
              const game = await Game.findById(activity.gameId)
                  .select('title coverImage genres platforms developer')
                  .lean();

              if (game) {
                // Update the activity record with cached game data (optional performance optimization)
                await UserActivity.findByIdAndUpdate(activity._id, {
                  gameTitle: game.title,
                  gameCover: game.coverImage,
                  gameGenres: game.genres,
                  gamePlatforms: game.platforms
                }, { runValidators: false });

                // Return enriched activity
                return {
                  ...activity,
                  gameTitle: game.title,
                  gameCover: game.coverImage,
                  gameGenres: game.genres,
                  gamePlatforms: game.platforms,
                  gameDeveloper: game.developer
                };
              }
            } catch (gameError) {
              console.warn(`⚠️ Failed to fetch game data for activity ${activity._id}:`, gameError.message);
            }
          }

          return activity;
        })
    );

    res.json(enrichedActivities);
  } catch (err) {
    console.error('❌ Enhanced getUserActivity error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ===== ENHANCED LIKE TOGGLE - Game bilgilerini cache'ler =====
exports.toggleLike = async (req, res) => {
  const userId = req.user.id;
  const { gameId } = req.body;

  try {
    const filter = { userId, gameId, activityType: "like" };
    const existing = await UserActivity.findOne(filter);

    if (existing) {
      // Remove like
      await UserActivity.deleteOne({ _id: existing._id });
      // Update game statistics
      await updateGameStats(gameId, 'like', userId, false);
      return res.json({ liked: false });
    } else {
      // Handle opposite activity first
      await handleOppositeActivity(gameId, userId, 'like');
      
      // Remove conflicting activities
      await UserActivity.deleteMany({ 
        userId, 
        gameId, 
        activityType: { $in: ["dislike", "loved"] } 
      });

      // Fetch game data for caching
      const game = await Game.findById(gameId).select('title coverImage genres platforms').lean();

      // Create new like activity with cached game data
      await UserActivity.create({
        ...filter,
        gameTitle: game?.title || '',
        gameCover: game?.coverImage || '',
        gameGenres: game?.genres || [],
        gamePlatforms: game?.platforms || [],
        source: 'manual'
      });

      // Update game statistics
      await updateGameStats(gameId, 'like', userId, true);
      
      return res.json({ liked: true });
    }
  } catch (err) {
    console.error('❌ Enhanced toggleLike error:', err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
};

// ===== ENHANCED DISLIKE TOGGLE =====
exports.toggleDislike = async (req, res) => {
  const userId = req.user.id;
  const { gameId } = req.body;

  try {
    const filter = { userId, gameId, activityType: "dislike" };
    const existing = await UserActivity.findOne(filter);

    if (existing) {
      // Remove dislike
      await UserActivity.deleteOne({ _id: existing._id });
      // Update game statistics
      await updateGameStats(gameId, 'dislike', userId, false);
      return res.json({ disliked: false });
    } else {
      // Handle opposite activity first
      await handleOppositeActivity(gameId, userId, 'dislike');
      
      // Remove conflicting activities
      await UserActivity.deleteMany({ 
        userId, 
        gameId, 
        activityType: { $in: ["like", "loved"] } 
      });

      // Fetch game data for caching
      const game = await Game.findById(gameId).select('title coverImage genres platforms').lean();

      // Create new dislike activity with cached game data
      await UserActivity.create({
        ...filter,
        gameTitle: game?.title || '',
        gameCover: game?.coverImage || '',
        gameGenres: game?.genres || [],
        gamePlatforms: game?.platforms || [],
        source: 'manual'
      });

      // Update game statistics
      await updateGameStats(gameId, 'dislike', userId, true);

      return res.json({ disliked: true });
    }
  } catch (err) {
    console.error('❌ Enhanced toggleDislike error:', err);
    res.status(500).json({ error: "Failed to toggle dislike" });
  }
};

// ===== ENHANCED LOVED TOGGLE - Netflix-style double thumbs up =====
exports.toggleLoved = async (req, res) => {
  const userId = req.user.id;
  const { gameId } = req.body;

  try {
    const filter = { userId, gameId, activityType: "loved" };
    const existing = await UserActivity.findOne(filter);

    if (existing) {
      // Remove loved
      await UserActivity.deleteOne({ _id: existing._id });
      // Update game statistics
      await updateGameStats(gameId, 'loved', userId, false);
      return res.json({ loved: false });
    } else {
      // Handle opposite activity first
      await handleOppositeActivity(gameId, userId, 'loved');
      
      // Remove conflicting activities
      await UserActivity.deleteMany({ 
        userId, 
        gameId, 
        activityType: { $in: ["like", "dislike"] } 
      });

      // Fetch game data for caching
      const game = await Game.findById(gameId).select('title coverImage genres platforms').lean();

      // Create new loved activity with cached game data
      await UserActivity.create({
        ...filter,
        gameTitle: game?.title || '',
        gameCover: game?.coverImage || '',
        gameGenres: game?.genres || [],
        gamePlatforms: game?.platforms || [],
        source: 'manual'
      });

      // Update game statistics
      await updateGameStats(gameId, 'loved', userId, true);
      
      return res.json({ loved: true });
    }
  } catch (err) {
    console.error('❌ Enhanced toggleLoved error:', err);
    res.status(500).json({ error: "Failed to toggle loved" });
  }
};

// ===== ENHANCED PROGRESS SAVE =====
exports.saveProgress = async (req, res) => {
  try {
    const { gameId, progress, platform, device, sessionDuration, difficulty, playstyle } = req.body;
    const userId = req.user.id;

    console.log('🎮 Enhanced progress save:', { userId, gameId, progress, platform, sessionDuration });

    // Fetch game data for caching
    const game = await Game.findById(gameId).select('title coverImage genres platforms').lean();

    // Prepare activity data
    const activityData = {
      userId,
      gameId,
      activityType: "progress",
      progress: progress || 0,
      gameTitle: game?.title || '',
      gameCover: game?.coverImage || '',
      gameGenres: game?.genres || [],
      gamePlatforms: game?.platforms || [],
      platform: platform || 'PC',
      device: device || '',
      sessionDuration: sessionDuration || 0,
      difficulty: difficulty || '',
      playstyle: playstyle || '',
      source: 'manual',
      date: new Date()
    };

    // Update or create progress activity
    const activity = await UserActivity.findOneAndUpdate(
        { userId, gameId, activityType: "progress" },
        activityData,
        { upsert: true, new: true, runValidators: true }
    );

    console.log('✅ Progress activity saved:', activity._id);
    res.json(activity);
  } catch (err) {
    console.error('❌ Enhanced saveProgress error:', err);
    res.status(500).json({ error: "Progress save failed: " + err.message });
  }
};

// ===== ENHANCED PLAN TO PLAY TOGGLE =====
exports.togglePlanToPlay = async (req, res) => {
  const userId = req.user.id;
  const { gameId } = req.body;

  try {
    const filter = { userId, gameId, activityType: "plantoplay" };
    const existing = await UserActivity.findOne(filter);

    if (existing) {
      // Remove plan to play
      await UserActivity.deleteOne({ _id: existing._id });
      // Update game statistics
      await updateGameStats(gameId, 'plantoplay', userId, false);
      return res.json({ plantoplay: false });
    } else {
      // Fetch game data for caching
      const game = await Game.findById(gameId).select('title coverImage genres platforms').lean();

      // Create new plan to play activity with cached game data
      await UserActivity.create({
        ...filter,
        gameTitle: game?.title || '',
        gameCover: game?.coverImage || '',
        gameGenres: game?.genres || [],
        gamePlatforms: game?.platforms || [],
        source: 'manual'
      });

      // Update game statistics
      await updateGameStats(gameId, 'plantoplay', userId, true);

      return res.json({ plantoplay: true });
    }
  } catch (err) {
    console.error('❌ Enhanced togglePlanToPlay error:', err);
    res.status(500).json({ error: "Failed to toggle plan to play" });
  }
};

// ===== NEW: ADD REVIEW ACTIVITY =====
exports.addReviewActivity = async (req, res) => {
  try {
    const { gameId, reviewTitle, reviewText, rating, spoiler, recommended, platform, difficulty } = req.body;
    const userId = req.user.id;

    console.log('✍️ Adding review activity:', { userId, gameId, rating });

    // Fetch game data for caching
    const game = await Game.findById(gameId).select('title coverImage genres platforms').lean();

    // Create review activity
    const reviewActivity = await UserActivity.create({
      userId,
      gameId,
      activityType: "review",
      reviewTitle: reviewTitle || '',
      reviewText: reviewText || '',
      rating: rating || 0,
      spoiler: spoiler || false,
      reviewRecommended: recommended || null,
      gameTitle: game?.title || '',
      gameCover: game?.coverImage || '',
      gameGenres: game?.genres || [],
      gamePlatforms: game?.platforms || [],
      platform: platform || 'PC',
      difficulty: difficulty || '',
      source: 'manual'
    });

    // Update game statistics
    await updateGameStats(gameId, 'review', userId, true);

    console.log('✅ Review activity created:', reviewActivity._id);
    res.status(201).json(reviewActivity);
  } catch (err) {
    console.error('❌ Add review activity error:', err);
    res.status(500).json({ error: "Failed to add review: " + err.message });
  }
};

// ===== NEW: ADD ACHIEVEMENT ACTIVITY =====
exports.addAchievementActivity = async (req, res) => {
  try {
    const { gameId, achievements, platform } = req.body;
    const userId = req.user.id;

    console.log('🏆 Adding achievement activity:', { userId, gameId, achievements });

    // Fetch game data for caching
    const game = await Game.findById(gameId).select('title coverImage genres platforms').lean();

    // Create achievement activity
    const achievementActivity = await UserActivity.create({
      userId,
      gameId,
      activityType: "achievement",
      achievements: achievements || [],
      gameTitle: game?.title || '',
      gameCover: game?.coverImage || '',
      gameGenres: game?.genres || [],
      gamePlatforms: game?.platforms || [],
      platform: platform || 'PC',
      source: 'auto'
    });

    console.log('✅ Achievement activity created:', achievementActivity._id);
    res.status(201).json(achievementActivity);
  } catch (err) {
    console.error('❌ Add achievement activity error:', err);
    res.status(500).json({ error: "Failed to add achievement: " + err.message });
  }
};

// ===== NEW: ADD SESSION ACTIVITY =====
exports.addSessionActivity = async (req, res) => {
  try {
    const { gameId, sessionDuration, platform, device } = req.body;
    const userId = req.user.id;

    console.log('⏱️ Adding session activity:', { userId, gameId, sessionDuration });

    // Fetch game data for caching
    const game = await Game.findById(gameId).select('title coverImage genres platforms').lean();

    // Create session activity
    const sessionActivity = await UserActivity.create({
      userId,
      gameId,
      activityType: "session",
      sessionDuration: sessionDuration || 0,
      gameTitle: game?.title || '',
      gameCover: game?.coverImage || '',
      gameGenres: game?.genres || [],
      gamePlatforms: game?.platforms || [],
      platform: platform || 'PC',
      device: device || '',
      source: 'auto'
    });

    console.log('✅ Session activity created:', sessionActivity._id);
    res.status(201).json(sessionActivity);
  } catch (err) {
    console.error('❌ Add session activity error:', err);
    res.status(500).json({ error: "Failed to add session: " + err.message });
  }
};

// ===== EXISTING FUNCTIONS (Updated with enhanced logging) =====

exports.getLikeStatus = async (req, res) => {
  const { userId, gameId } = req.params;
  try {
    const like = await UserActivity.findOne({ userId, gameId, activityType: "like" });
    res.json({ liked: !!like });
  } catch (err) {
    console.error('❌ getLikeStatus error:', err);
    res.status(500).json({ error: "Failed to get like status" });
  }
};

exports.getLovedStatus = async (req, res) => {
  const { userId, gameId } = req.params;
  try {
    const loved = await UserActivity.findOne({ userId, gameId, activityType: "loved" });
    res.json({ loved: !!loved });
  } catch (err) {
    console.error('❌ getLovedStatus error:', err);
    res.status(500).json({ error: "Failed to get loved status" });
  }
};

exports.getDislikeStatus = async (req, res) => {
  const { userId, gameId } = req.params;
  try {
    const dislike = await UserActivity.findOne({ userId, gameId, activityType: "dislike" });
    res.json({ disliked: !!dislike });
  } catch (err) {
    console.error('❌ getDislikeStatus error:', err);
    res.status(500).json({ error: "Failed to get dislike status" });
  }
};

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
    console.error('❌ getLastProgress error:', err);
    res.status(500).json({ error: "Failed to fetch progress" });
  }
};

exports.getPlanToPlayStatus = async (req, res) => {
  const { userId, gameId } = req.params;
  try {
    const plan = await UserActivity.findOne({ userId, gameId, activityType: "plantoplay" });
    res.json({ plantoplay: !!plan });
  } catch (err) {
    console.error('❌ getPlanToPlayStatus error:', err);
    res.status(500).json({ error: "Failed to get plan to play status" });
  }
};

// ===== STATISTICS FUNCTIONS =====

exports.getLikedCount = async (req, res) => {
  try {
    const { gameId } = req.params;
    const count = await UserActivity.countDocuments({
      gameId,
      activityType: "like"
    });
    res.json({ count });
  } catch (err) {
    console.error("❌ getLikedCount error:", err);
    res.status(500).json({ error: "Failed to get liked count" });
  }
};

exports.getDislikedCount = async (req, res) => {
  try {
    const { gameId } = req.params;
    const count = await UserActivity.countDocuments({
      gameId,
      activityType: "dislike"
    });
    res.json({ count });
  } catch (err) {
    console.error("❌ getDislikedCount error:", err);
    res.status(500).json({ error: "Failed to get disliked count" });
  }
};

exports.getPlanToPlayCount = async (req, res) => {
  try {
    const { gameId } = req.params;
    const count = await UserActivity.countDocuments({
      gameId,
      activityType: "plantoplay"
    });
    res.json({ count });
  } catch (err) {
    console.error("❌ getPlanToPlayCount error:", err);
    res.status(500).json({ error: "Failed to get plan to play count" });
  }
};

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
    console.error("❌ getCompletedCount error:", err);
    res.status(500).json({ error: "Failed to get completed count" });
  }
};

exports.getGameStats = async (req, res) => {
  try {
    const { gameId } = req.params;

    const [liked, loved, disliked, plantoplay, completed] = await Promise.all([
      UserActivity.countDocuments({ gameId, activityType: "like" }),
      UserActivity.countDocuments({ gameId, activityType: "loved" }),
      UserActivity.countDocuments({ gameId, activityType: "dislike" }),
      UserActivity.countDocuments({ gameId, activityType: "plantoplay" }),
      UserActivity.countDocuments({ gameId, activityType: "progress", progress: { $gte: 100 } })
    ]);

    res.json({ liked, loved, disliked, plantoplay, completed });
  } catch (err) {
    console.error("❌ getGameStats error:", err);
    res.status(500).json({ error: "Failed to get game stats" });
  }
};