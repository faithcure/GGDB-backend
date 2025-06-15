const Game = require("../models/Game");
const mongoose = require("mongoose");

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

  // MongoDB ObjectId formatını kontrol et
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    return res.status(400).json({ error: "Invalid game ID format" });
  }

  try {
    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });
    res.json(game.reviews || []);
  } catch (err) {
    console.error("Get reviews error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Yeni review ekle
exports.addGameReview = async (req, res) => {
  const gameId = req.params.id;
  const { user, comment, rating, spoiler } = req.body;

  // MongoDB ObjectId formatını kontrol et
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    return res.status(400).json({ error: "Invalid game ID format" });
  }

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
    console.error("Add review error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.getGameById = async (req, res) => {
  try {
    const gameId = req.params.id;

    // Debug log'ları ekle
    console.log("🔍 Received Game ID:", gameId);
    console.log("🔍 ID Type:", typeof gameId);
    console.log("🔍 Request params:", req.params);

    // ID boş mu kontrol et
    if (!gameId) {
      console.error("❌ Game ID is missing");
      return res.status(400).json({ error: "Game ID is required" });
    }

    // MongoDB ObjectId formatını kontrol et
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      console.error("❌ Invalid MongoDB ObjectId format:", gameId);
      return res.status(400).json({ error: "Invalid game ID format" });
    }

    console.log("✅ Searching for game with ID:", gameId);
    const game = await Game.findById(gameId);

    if (!game) {
      console.error("❌ Game not found with ID:", gameId);
      return res.status(404).json({ error: "Game not found" });
    }

    console.log("✅ Game found:", game.title);
    res.json(game);
  } catch (err) {
    console.error("❌ Database error:", err);
    res.status(500).json({
      error: "Failed to fetch game",
      details: err.message
    });
  }
};

exports.getSimilarGames = async (req, res) => {
  const gameId = req.params.id;

  // MongoDB ObjectId formatını kontrol et
  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    return res.status(400).json({ error: "Invalid game ID format" });
  }

  try {
    const currentGame = await Game.findById(gameId);
    if (!currentGame) return res.status(404).json({ error: "Game not found" });

    const similarGames = await Game.find({
      _id: { $ne: gameId },
      $or: [
        { genres: { $in: currentGame.genres || [] } },
        { platforms: { $in: currentGame.platforms || [] } },
      ],
    })
        .limit(5)
        .select("title coverImage _id")
        .lean();

    if (!similarGames.length) {
      const fallback = await Game.find({ _id: { $ne: gameId } })
          .limit(5)
          .select("title coverImage _id");
      return res.json(fallback);
    }

    res.json(similarGames);
  } catch (err) {
    console.error("Similar games error:", err);
    res.status(500).json({ error: "Failed to fetch similar games" });
  }
};

exports.getTopRatedGames = async (req, res) => {
  try {
    const topGames = await Game.find()
        .sort({ ggdbRating: -1 })
        .limit(5)
        .select("title coverImage ggdbRating");
    res.json(topGames);
  } catch (err) {
    console.error("Top rated games error:", err);
    res.status(500).json({ error: "Failed to fetch top rated games" });
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
      crewList: req.body.crewList || [], // crewList eklendi
      languages: req.body.languages || { audio: [], subtitles: [], interface: [] },
      systemRequirements: req.body.systemRequirements || { minimum: "", recommended: "" },
    };

    const newGame = new Game(gameData);
    await newGame.save();
    console.log("✅ New game created:", newGame.title);
    res.status(201).json(newGame);
  } catch (err) {
    console.error("❌ Game create error:", err);
    res.status(400).json({
      error: "Failed to add game",
      detail: err.message,
      fields: err.errors,
    });
  }
};

exports.updateGame = async (req, res) => {
  try {
    const gameId = req.params.id;

    // MongoDB ObjectId formatını kontrol et
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: "Invalid game ID format" });
    }

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
      crewList: req.body.crewList || [], // crewList eklendi
      languages: req.body.languages || { audio: [], subtitles: [], interface: [] },
      systemRequirements: req.body.systemRequirements || { minimum: "", recommended: "" },
    };

    const updatedGame = await Game.findByIdAndUpdate(gameId, gameData, { new: true });

    if (!updatedGame) {
      return res.status(404).json({ error: "Game not found" });
    }

    console.log("✅ Game updated:", updatedGame.title);
    res.json(updatedGame);
  } catch (err) {
    console.error("❌ Game update error:", err);
    res.status(400).json({
      error: "Failed to update game",
      details: err.message
    });
  }
};

exports.deleteGame = async (req, res) => {
  try {
    const gameId = req.params.id;

    // MongoDB ObjectId formatını kontrol et
    if (!mongoose.Types.ObjectId.isValid(gameId)) {
      return res.status(400).json({ error: "Invalid game ID format" });
    }

    const deletedGame = await Game.findByIdAndDelete(gameId);

    if (!deletedGame) {
      return res.status(404).json({ error: "Game not found" });
    }

    console.log("✅ Game deleted:", deletedGame.title);
    res.json({ message: "Game deleted successfully" });
  } catch (err) {
    console.error("❌ Game delete error:", err);
    res.status(500).json({
      error: "Failed to delete game",
      details: err.message
    });
  }
};