// 📁 routes/gameRoutes.js - Complete updated version with contributors
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const {
  getAllGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  getGameReviews,
  addGameReview,
  getSimilarGames,
  getTopRatedGames
} = require("../controllers/gameController");
const { authMiddleware } = require("../middleware/authMiddleware");
const Game = require("../models/Game");

// ⚠️ IMPORTANT: Specific routes MUST come BEFORE parameterized routes
// Otherwise Express will treat "top" and "similar" as IDs

// GET top rated games - MUST be before /:id routes
router.get("/top/rated", getTopRatedGames);

// GET all games
router.get("/", getAllGames);

// CREATE new game
router.post("/", createGame);

// GET similar games for a specific game - MUST be before /:id route
router.get("/:id/similar", getSimilarGames);

// GET reviews for a game
router.get("/:id/reviews", getGameReviews);

// ADD a review for a game
router.post("/:id/reviews", addGameReview);

// ========== CONTRIBUTORS ROUTES - MUST be before /:id route ==========

// Update game contributors
router.put("/:id/contributors", authMiddleware, async (req, res) => {
  try {
    const gameId = req.params.id;
    const { crewList } = req.body;

    // MongoDB ObjectId formatını kontrol et
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: "Invalid game ID format" });
    }

    // Crew list validation
    if (!Array.isArray(crewList)) {
      return res.status(400).json({ error: "crewList must be an array" });
    }

    // Validate each crew member
    const validatedCrewList = crewList.map(crew => ({
      id: crew.id || Date.now().toString(),
      name: crew.name || "",
      role: crew.role || "",
      image: crew.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(crew.name)}&background=random&color=fff&size=40`,
      isRegisteredUser: crew.isRegisteredUser || false,
      userId: crew.userId || null,
      createdAt: crew.createdAt || new Date(),
      updatedAt: new Date()
    }));

    const updatedGame = await Game.findByIdAndUpdate(
        gameId,
        {
          crewList: validatedCrewList,
          updatedAt: new Date()
        },
        { new: true }
    );

    if (!updatedGame) {
      return res.status(404).json({ error: "Game not found" });
    }

    console.log(`✅ Contributors updated for game: ${updatedGame.title}`);
    res.json({
      message: "Contributors updated successfully",
      crewList: updatedGame.crewList
    });

  } catch (error) {
    console.error("❌ Contributors update error:", error);
    res.status(500).json({
      error: "Failed to update contributors",
      details: error.message
    });
  }
});

// Get game contributors
router.get("/:id/contributors", async (req, res) => {
  try {
    const gameId = req.params.id;

    // MongoDB ObjectId formatını kontrol et
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: "Invalid game ID format" });
    }

    const game = await Game.findById(gameId).select("crewList title");

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    res.json({
      crewList: game.crewList || [],
      gameTitle: game.title
    });

  } catch (error) {
    console.error("❌ Get contributors error:", error);
    res.status(500).json({
      error: "Failed to get contributors",
      details: error.message
    });
  }
});

// ========== EXISTING ROUTES - MUST be at the end ==========

// GET game by ID - MUST be after all specific /:id/* routes
router.get("/:id", getGameById);

// UPDATE game by ID
router.put("/:id", updateGame);

// DELETE game by ID
router.delete("/:id", deleteGame);

module.exports = router;