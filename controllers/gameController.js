// 📁 controllers/gameController.js - Enhanced with contributor duplicate detection

const Game = require("../models/Game");
const mongoose = require("mongoose");

// 🆕 Helper function to check for duplicate contributors
const checkForDuplicateContributors = (existingCrewList, newContributor) => {
  if (!existingCrewList || !Array.isArray(existingCrewList)) {
    return { isDuplicate: false, duplicateType: null, existingContributor: null };
  }

  for (const existing of existingCrewList) {
    // Check for userId match (registered users)
    if (existing.userId && newContributor.userId &&
        existing.userId.toString() === newContributor.userId.toString()) {
      return {
        isDuplicate: true,
        duplicateType: 'userId',
        existingContributor: existing,
        message: `This user is already a contributor with role: "${existing.role}"`
      };
    }

    // Check for name match (case insensitive, for guest contributors)
    if (!existing.userId && !newContributor.userId &&
        existing.name && newContributor.name &&
        existing.name.toLowerCase().trim() === newContributor.name.toLowerCase().trim()) {
      return {
        isDuplicate: true,
        duplicateType: 'name',
        existingContributor: existing,
        message: `A contributor with name "${existing.name}" already exists with role: "${existing.role}"`
      };
    }
  }

  return { isDuplicate: false, duplicateType: null, existingContributor: null };
};

// 🆕 Helper function to validate and clean contributor data
const validateContributorData = (contributor) => {
  const errors = [];

  if (!contributor.name || typeof contributor.name !== 'string' || !contributor.name.trim()) {
    errors.push('Contributor name is required');
  }

  if (!contributor.role || typeof contributor.role !== 'string' || !contributor.role.trim()) {
    errors.push('Contributor role is required');
  }

  if (contributor.name && contributor.name.length > 100) {
    errors.push('Contributor name cannot exceed 100 characters');
  }

  if (contributor.role && contributor.role.length > 200) {
    errors.push('Contributor role cannot exceed 200 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanData: {
      id: contributor.id || Date.now().toString(),
      name: contributor.name ? contributor.name.trim() : '',
      role: contributor.role ? contributor.role.trim() : '',
      image: contributor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.name || 'User')}&background=random&color=fff&size=40`,
      isRegisteredUser: Boolean(contributor.isRegisteredUser),
      userId: contributor.userId || null,
      department: contributor.department || null,
      bio: contributor.bio || null,
      socialLinks: contributor.socialLinks || [],
      createdAt: contributor.createdAt || new Date(),
      updatedAt: new Date()
    }
  };
};

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

    // 🆕 Validate contributors if provided
    if (gameData.crewList && gameData.crewList.length > 0) {
      const validationErrors = [];
      const validatedCrewList = [];

      for (let i = 0; i < gameData.crewList.length; i++) {
        const contributor = gameData.crewList[i];

        // Validate individual contributor
        const validation = validateContributorData(contributor);
        if (!validation.isValid) {
          validationErrors.push(`Contributor ${i + 1}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Check for duplicates
        const duplicateCheck = checkForDuplicateContributors(validatedCrewList, validation.cleanData);
        if (duplicateCheck.isDuplicate) {
          validationErrors.push(`Contributor ${i + 1}: ${duplicateCheck.message}`);
          continue;
        }

        validatedCrewList.push(validation.cleanData);
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Contributor validation failed",
          details: validationErrors
        });
      }

      gameData.crewList = validatedCrewList;
    }

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

    // 🆕 Validate contributors if provided
    if (gameData.crewList && gameData.crewList.length > 0) {
      const validationErrors = [];
      const validatedCrewList = [];

      for (let i = 0; i < gameData.crewList.length; i++) {
        const contributor = gameData.crewList[i];

        // Validate individual contributor
        const validation = validateContributorData(contributor);
        if (!validation.isValid) {
          validationErrors.push(`Contributor ${i + 1}: ${validation.errors.join(', ')}`);
          continue;
        }

        // Check for duplicates
        const duplicateCheck = checkForDuplicateContributors(validatedCrewList, validation.cleanData);
        if (duplicateCheck.isDuplicate) {
          validationErrors.push(`Contributor ${i + 1}: ${duplicateCheck.message}`);
          continue;
        }

        validatedCrewList.push(validation.cleanData);
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: "Contributor validation failed",
          details: validationErrors
        });
      }

      gameData.crewList = validatedCrewList;
    }

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