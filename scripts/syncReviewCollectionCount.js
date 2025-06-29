// Script to sync Review collection counts to Game.activityStats.reviewsCount
const mongoose = require("mongoose");
const Game = require("../models/Game");
const Review = require("../models/Review");

const syncReviewCollectionCount = async () => {
  try {
    console.log("🔄 Starting review collection count sync...");
    
    // Connect to database
    require('dotenv').config();
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGO_URI_LOCAL || "mongodb://localhost:27017/ggdb");
    
    const games = await Game.find({});
    console.log(`📊 Found ${games.length} games to sync`);
    
    let updated = 0;
    
    for (const game of games) {
      // Count reviews in Review collection for this game
      const reviewCount = await Review.countDocuments({ gameId: game._id });
      
      if (!game.activityStats) {
        game.activityStats = {
          likesCount: 0,
          dislikesCount: 0,
          planToPlayCount: 0,
          playersCount: 0,
          reviewsCount: reviewCount,
          lastUpdated: new Date()
        };
      } else {
        game.activityStats.reviewsCount = reviewCount;
        game.activityStats.lastUpdated = new Date();
      }
      
      await game.save();
      updated++;
      
      if (reviewCount > 0) {
        console.log(`✅ ${game.title}: ${reviewCount} reviews synced from Review collection`);
      }
    }
    
    console.log(`🎉 Review collection sync completed! Updated ${updated} games`);
    
    // Show summary stats
    const totalReviews = await Review.countDocuments({});
    const gamesWithReviews = await Game.countDocuments({ "activityStats.reviewsCount": { $gt: 0 } });
    
    console.log(`📈 Summary:`);
    console.log(`   Total reviews in Review collection: ${totalReviews}`);
    console.log(`   Games with reviews: ${gamesWithReviews}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  syncReviewCollectionCount();
}

module.exports = syncReviewCollectionCount;