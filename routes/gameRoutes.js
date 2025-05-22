const express = require("express");
const router = express.Router();
const {
  getAllGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
  getGameReviews,
  addGameReview
} = require("../controllers/gameController");
const { getSimilarGames } = require("../controllers/gameController");
router.get("/:id/similar", getSimilarGames);
const { getTopRatedGames } = require("../controllers/gameController");
router.get("/top/rated", getTopRatedGames);

// GET all games
router.get("/", getAllGames);

// GET game by ID
router.get("/:id", getGameById);

// CREATE new game
router.post("/", createGame);

// UPDATE game by ID
router.put("/:id", updateGame);

// DELETE game by ID
router.delete("/:id", deleteGame);

// GET reviews for a game
router.get("/:id/review", getGameReviews);   // ← ekle

// ADD a review for a game
router.post("/:id/review", addGameReview);   // ← ekle

module.exports = router;
