// routes/gameRoutes.js
const express = require("express");
const router = express.Router();
const {
  getAllGames,
  getGameById,
  createGame,
  updateGame,
  deleteGame,
} = require("../controllers/gameController");

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

module.exports = router;