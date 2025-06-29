// Script to sync existing reviews count to activityStats.reviewsCount
const mongoose = require("mongoose");
const Game = require("../models/Game");

const syncReviewsCount = async () => {
  try {
    console.log("🔄 Starting reviews count sync...");
    
    // Connect to database
    require('dotenv').config();
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URI_LOCAL || "mongodb://localhost:27017/ggdb");
    
    const games = await Game.find({});
    console.log(`📊 Found ${games.length} games to sync`);
    
    let updated = 0;
    
    for (const game of games) {
      const reviewsCount = game.reviews?.length || 0;
      
      if (!game.activityStats) {
        game.activityStats = {
          likesCount: 0,
          dislikesCount: 0,
          planToPlayCount: 0,
          playersCount: 0,
          reviewsCount: reviewsCount,
          lastUpdated: new Date()
        };
      } else {
        game.activityStats.reviewsCount = reviewsCount;
        game.activityStats.lastUpdated = new Date();
      }
      
      await game.save();
      updated++;
      
      if (reviewsCount > 0) {
        console.log(`✅ ${game.title}: ${reviewsCount} reviews synced`);
      }
    }
    
    console.log(`🎉 Sync completed! Updated ${updated} games`);
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  syncReviewsCount();
}

module.exports = syncReviewsCount;