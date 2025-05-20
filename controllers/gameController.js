const Game = require("../models/Game");

exports.getAllGames = async (req, res) => {
  try {
    const games = await Game.find();
    res.json(games);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch games" });
  }
};
// Tüm reviewları getir
exports.getGameReviews = async (req, res) => {
  const gameId = req.params.id;
  // Game modelinde reviewlar bir array içindeyse:
  try {
    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    res.json(game.reviews || []);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Yeni review ekle
exports.addGameReview = async (req, res) => {
  const gameId = req.params.id;
  const { user, comment, rating, spoiler } = req.body;
  try {
    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

    // Basitçe reviews arrayine ekle
    if (!game.reviews) game.reviews = [];
    game.reviews.push({
      user, comment, rating, spoiler, date: new Date()
    });
    await game.save();
    res.status(201).json({ success: true, reviews: game.reviews });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getGameById = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ error: "Game not found" });
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch game" });
  }
};

exports.createGame = async (req, res) => {
  try {
    const gameData = {
      ...req.body,
      tags: req.body.tags || [],
      genres: req.body.genres || [],
      platforms: req.body.platforms || [],
      cast: req.body.cast || [],
      contentWarnings: req.body.contentWarnings || [],
      ageRatings: req.body.ageRatings || [],
      gallery: req.body.gallery || [],
      dlcs: req.body.dlcs || [],
      awards: req.body.awards || [],
      inspiration: req.body.inspiration || [],
      storeLinks: req.body.storeLinks || [], 
      languages: req.body.languages || { audio: [], subtitles: [], interface: [] },
      systemRequirements: req.body.systemRequirements || { minimum: "", recommended: "" },
    };

    const newGame = new Game(gameData);
    await newGame.save();
    res.status(201).json(newGame);
  } catch (err) {
    res.status(400).json({ error: "Failed to add game" });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const gameData = {
      ...req.body,
      tags: req.body.tags || [],
      genres: req.body.genres || [],
      platforms: req.body.platforms || [],
      cast: req.body.cast || [],
      contentWarnings: req.body.contentWarnings || [],
      ageRatings: req.body.ageRatings || [],
      gallery: req.body.gallery || [],
      dlcs: req.body.dlcs || [],
      awards: req.body.awards || [],
      inspiration: req.body.inspiration || [],
      storeLinks: req.body.storeLinks || [], 
      languages: req.body.languages || { audio: [], subtitles: [], interface: [] },
      systemRequirements: req.body.systemRequirements || { minimum: "", recommended: "" },
    };

    const updatedGame = await Game.findByIdAndUpdate(req.params.id, gameData, { new: true });
    console.log("✅ OYUN GÜNCELLENDİ:", updatedGame);
    res.json(updatedGame);
  } catch (err) {
    res.status(400).json({ error: "Failed to update game" });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    await Game.findByIdAndDelete(req.params.id);
    res.json({ message: "Game deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete game" });
  }
};
