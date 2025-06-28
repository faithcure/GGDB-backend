// 📁 controllers/gameController.js - Enhanced with roles array support

const Game = require("../models/Game");
const mongoose = require("mongoose");

// 🆕 Helper function to check for duplicate contributors (updated for roles array)
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
        message: `This user is already a contributor`
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
        message: `A contributor with name "${existing.name}" already exists`
      };
    }
  }

  return { isDuplicate: false, duplicateType: null, existingContributor: null };
};

// 🆕 Helper function to validate and clean contributor data (updated for roles array)
const validateContributorData = (contributor) => {
  const errors = [];

  if (!contributor.name || typeof contributor.name !== 'string' || !contributor.name.trim()) {
    errors.push('Contributor name is required');
  }

  // 🆕 Validate roles array
  if (!contributor.roles || !Array.isArray(contributor.roles) || contributor.roles.length === 0) {
    errors.push('At least one role is required');
  } else {
    contributor.roles.forEach((role, index) => {
      if (!role.name || typeof role.name !== 'string' || !role.name.trim()) {
        errors.push(`Role ${index + 1}: Role name is required`);
      }
      if (!role.department || typeof role.department !== 'string' || !role.department.trim()) {
        errors.push(`Role ${index + 1}: Department is required`);
      }
      if (role.name && role.name.length > 100) {
        errors.push(`Role ${index + 1}: Role name cannot exceed 100 characters`);
      }
    });
  }

  if (contributor.name && contributor.name.length > 100) {
    errors.push('Contributor name cannot exceed 100 characters');
  }

  // 🔧 BACKWARD COMPATIBILITY: Handle old role/department format
  let cleanRoles = [];
  if (contributor.roles && Array.isArray(contributor.roles)) {
    cleanRoles = contributor.roles.map(role => ({
      name: role.name ? role.name.trim() : '',
      department: role.department ? role.department.trim() : ''
    })).filter(role => role.name && role.department);
  } else if (contributor.role && contributor.department) {
    // Convert old format to new format
    const roles = contributor.role.split(' & ').map(r => r.trim());
    cleanRoles = roles.map(roleName => ({
      name: roleName,
      department: contributor.department.trim()
    }));
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanData: {
      id: contributor.id || Date.now().toString(),
      name: contributor.name ? contributor.name.trim() : '',
      roles: cleanRoles,
      image: contributor.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.name || 'User')}&background=random&color=fff&size=40`,
      isRegisteredUser: Boolean(contributor.isRegisteredUser),
      userId: contributor.userId || null,
      bio: contributor.bio || null,
      socialLinks: contributor.socialLinks || [],
      createdAt: contributor.createdAt || new Date(),
      updatedAt: new Date()
    }
  };
};

// 🆕 Helper function to format contributor for response (backward compatibility)
const formatContributorForResponse = (contributor) => {
  const formatted = {
    id: contributor.id,
    name: contributor.name,
    image: contributor.image,
    isRegisteredUser: contributor.isRegisteredUser,
    userId: contributor.userId,
    bio: contributor.bio,
    socialLinks: contributor.socialLinks,
    createdAt: contributor.createdAt,
    updatedAt: contributor.updatedAt
  };

  // 🆕 NEW FORMAT: Include roles array
  if (contributor.roles && contributor.roles.length > 0) {
    formatted.roles = contributor.roles;
    // Also provide legacy format for backward compatibility
    formatted.role = contributor.roles.map(r => r.name).join(' & ');
    formatted.department = contributor.roles[0].department; // Primary department
  } else {
    // 🔧 FALLBACK: Old format
    formatted.role = contributor.role || '';
    formatted.department = contributor.department || '';
    formatted.roles = contributor.role ? [{
      name: contributor.role,
      department: contributor.department || 'Other'
    }] : [];
  }

  return formatted;
};

exports.getAllGames = async (req, res) => {
  try {
    const games = await Game.find();

    // 🆕 Format crewList for response
    const formattedGames = games.map(game => ({
      ...game.toObject(),
      crewList: game.crewList.map(formatContributorForResponse)
    }));

    res.json(formattedGames);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch games" });
  }
};

exports.getGameReviews = async (req, res) => {
  const gameId = req.params.id;

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

exports.addGameReview = async (req, res) => {
  const gameId = req.params.id;
  const { user, comment, rating, spoiler } = req.body;

  if (!mongoose.Types.ObjectId.isValid(gameId)) {
    return res.status(400).json({ error: "Invalid game ID format" });
  }

  try {
    const game = await Game.findById(gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

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

    console.log("🔍 Received Game ID:", gameId);

    if (!gameId) {
      console.error("❌ Game ID is missing");
      return res.status(400).json({ error: "Game ID is required" });
    }

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

    // 🆕 Format crewList for response
    const formattedGame = {
      ...game.toObject(),
      crewList: game.crewList.map(formatContributorForResponse)
    };

    console.log("✅ Game found:", game.title);
    res.json(formattedGame);
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
      crewList: req.body.crewList || [],
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

    // 🆕 Format response
    const formattedGame = {
      ...newGame.toObject(),
      crewList: newGame.crewList.map(formatContributorForResponse)
    };

    console.log("✅ New game created:", newGame.title);
    res.status(201).json(formattedGame);
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
      crewList: req.body.crewList || [],
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

    // 🆕 Format response
    const formattedGame = {
      ...updatedGame.toObject(),
      crewList: updatedGame.crewList.map(formatContributorForResponse)
    };

    console.log("✅ Game updated:", updatedGame.title);
    res.json(formattedGame);
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

// 🆕 Search games functionality - IMDB style
exports.searchGames = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        error: "Search query must be at least 2 characters long" 
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    const limitNum = Math.min(parseInt(limit) || 10, 50); // Max 50 results

    // Search in multiple fields: title, developer, publisher, genres
    const searchQuery = {
      $or: [
        { title: { $regex: searchRegex } },
        { developer: { $regex: searchRegex } },
        { publisher: { $regex: searchRegex } },
        { genres: { $in: [searchRegex] } },
        { platforms: { $in: [searchRegex] } }
      ]
    };

    const games = await Game.find(searchQuery)
      .select('title coverImage releaseDate developer publisher genres platforms averageRating description gallery videos screenshots')
      .sort({ averageRating: -1, releaseDate: -1 }) // Sort by rating then release date
      .limit(limitNum)
      .lean();

    // Format results for frontend
    const formattedResults = games.map((game, index) => ({
      _id: game._id,
      title: game.title,
      coverImage: game.coverImage || '/placeholder-game.jpg',
      releaseYear: game.releaseDate ? new Date(game.releaseDate).getFullYear() : null,
      developer: game.developer || 'Unknown Developer',
      publisher: game.publisher || game.developer || 'Unknown Publisher',
      genres: Array.isArray(game.genres) ? game.genres.slice(0, 3) : [], // Max 3 genres
      platforms: Array.isArray(game.platforms) ? game.platforms.slice(0, 4) : [], // Max 4 platforms
      averageRating: game.averageRating || 0,
      description: game.description ? game.description.substring(0, 150) + '...' : '',
      // Enhanced data for first result
      ...(index === 0 && {
        gallery: Array.isArray(game.gallery) ? game.gallery.slice(0, 4) : [],
        videos: Array.isArray(game.videos) ? game.videos.slice(0, 2) : [],
        screenshots: Array.isArray(game.screenshots) ? game.screenshots.slice(0, 3) : [],
        fullDescription: game.description || ''
      })
    }));

    console.log(`🔍 Search: "${query}" - ${formattedResults.length} results found`);
    
    res.json({
      query: query.trim(),
      results: formattedResults,
      totalFound: formattedResults.length,
      hasMore: formattedResults.length === limitNum
    });

  } catch (err) {
    console.error("❌ Game search error:", err);
    res.status(500).json({
      error: "Failed to search games",
      details: err.message
    });
  }
};

// 🆕 Search people in game contributors
exports.searchPeople = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        error: "Search query must be at least 2 characters long" 
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    const limitNum = Math.min(parseInt(limit) || 10, 50);

    // Search in game contributors
    const games = await Game.find({
      'crewList.name': { $regex: searchRegex }
    })
    .select('title coverImage crewList')
    .limit(limitNum * 2) // Get more games to extract people
    .lean();

    // Extract unique people from crews
    const peopleMap = new Map();
    
    games.forEach(game => {
      if (game.crewList && Array.isArray(game.crewList)) {
        game.crewList.forEach(person => {
          if (person.name && searchRegex.test(person.name)) {
            const key = person.userId || person.name.toLowerCase();
            if (!peopleMap.has(key)) {
              peopleMap.set(key, {
                _id: person.userId || person.id,
                name: person.name,
                department: person.department || 'Unknown',
                role: person.role || 'Unknown',
                image: person.image,
                isRegisteredUser: person.isRegisteredUser || false,
                gameCount: 1,
                games: [{ _id: game._id, title: game.title, coverImage: game.coverImage }]
              });
            } else {
              const existing = peopleMap.get(key);
              existing.gameCount++;
              if (existing.games.length < 3) {
                existing.games.push({ _id: game._id, title: game.title, coverImage: game.coverImage });
              }
            }
          }
        });
      }
    });

    const results = Array.from(peopleMap.values()).slice(0, limitNum);

    console.log(`🔍 People Search: "${query}" - ${results.length} results found`);
    
    res.json({
      query: query.trim(),
      results: results,
      totalFound: results.length,
      hasMore: results.length === limitNum
    });

  } catch (err) {
    console.error("❌ People search error:", err);
    res.status(500).json({
      error: "Failed to search people",
      details: err.message
    });
  }
};