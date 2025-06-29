const Game = require("../models/Game");
const UserActivity = require("../models/UserActivity");

/**
 * Update game activity statistics when user activities change
 */
const updateGameStats = async (gameId, activityType, userId, isAdding = true, oldProgress = null, newProgress = null) => {
  try {
    if (!gameId) return;

    const game = await Game.findById(gameId);
    if (!game) return;

    const increment = isAdding ? 1 : -1;
    
    // Initialize activityStats if it doesn't exist
    if (!game.activityStats) {
      game.activityStats = {
        likesCount: 0,
        lovedCount: 0,
        dislikesCount: 0,
        planToPlayCount: 0,
        playersCount: 0,
        reviewsCount: 0,
        lastUpdated: new Date()
      };
    }

    switch (activityType) {
      case 'like':
        game.activityStats.likesCount = Math.max(0, game.activityStats.likesCount + increment);
        break;
        
      case 'loved':
        game.activityStats.lovedCount = Math.max(0, game.activityStats.lovedCount + increment);
        break;
        
      case 'dislike':
        game.activityStats.dislikesCount = Math.max(0, game.activityStats.dislikesCount + increment);
        break;
        
      case 'plantoplay':
        game.activityStats.planToPlayCount = Math.max(0, game.activityStats.planToPlayCount + increment);
        break;
        
      case 'review':
        game.activityStats.reviewsCount = Math.max(0, game.activityStats.reviewsCount + increment);
        break;
        
      case 'progress':
        // Special handling for progress - check if user crosses 0 threshold
        if (oldProgress !== null && newProgress !== null) {
          const wasPlaying = oldProgress > 0;
          const isPlaying = newProgress > 0;
          
          if (!wasPlaying && isPlaying) {
            // User started playing (0 -> >0)
            game.activityStats.playersCount = Math.max(0, game.activityStats.playersCount + 1);
          } else if (wasPlaying && !isPlaying) {
            // User stopped playing (>0 -> 0)
            game.activityStats.playersCount = Math.max(0, game.activityStats.playersCount - 1);
          }
        }
        break;
    }

    game.activityStats.lastUpdated = new Date();
    await game.save();
    
    console.log(`📊 Updated stats for game ${gameId}: ${activityType} ${isAdding ? '+' : '-'}1`);
    
  } catch (error) {
    console.error('Error updating game stats:', error);
  }
};

/**
 * Handle opposite activity removal (like/loved -> dislike removes like/loved, etc.)
 */
const handleOppositeActivity = async (gameId, userId, newActivityType) => {
  try {
    if (newActivityType === 'like') {
      // Check if user had dislike or loved before
      const [hadDislike, hadLoved] = await Promise.all([
        UserActivity.findOne({ gameId, userId, activityType: 'dislike' }),
        UserActivity.findOne({ gameId, userId, activityType: 'loved' })
      ]);
      
      if (hadDislike) {
        await updateGameStats(gameId, 'dislike', userId, false);
      }
      if (hadLoved) {
        await updateGameStats(gameId, 'loved', userId, false);
      }
    } else if (newActivityType === 'loved') {
      // Check if user had dislike or like before
      const [hadDislike, hadLike] = await Promise.all([
        UserActivity.findOne({ gameId, userId, activityType: 'dislike' }),
        UserActivity.findOne({ gameId, userId, activityType: 'like' })
      ]);
      
      if (hadDislike) {
        await updateGameStats(gameId, 'dislike', userId, false);
      }
      if (hadLike) {
        await updateGameStats(gameId, 'like', userId, false);
      }
    } else if (newActivityType === 'dislike') {
      // Check if user had like or loved before
      const [hadLike, hadLoved] = await Promise.all([
        UserActivity.findOne({ gameId, userId, activityType: 'like' }),
        UserActivity.findOne({ gameId, userId, activityType: 'loved' })
      ]);
      
      if (hadLike) {
        await updateGameStats(gameId, 'like', userId, false);
      }
      if (hadLoved) {
        await updateGameStats(gameId, 'loved', userId, false);
      }
    }
  } catch (error) {
    console.error('Error handling opposite activity:', error);
  }
};

module.exports = {
  updateGameStats,
  handleOppositeActivity
};