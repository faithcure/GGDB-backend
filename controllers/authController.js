// 📁 controllers/authController.js - Complete with username change detection
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Game = require("../models/Game");

// ✅ EMAIL CHECK
exports.checkEmail = async (req, res) => {
  const { email } = req.body;
  try {
    const existing = await User.findOne({ email });
    res.json({ exists: !!existing });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ REGISTER
exports.register = async (req, res) => {
  const { username, dob, country, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email is already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username, dob, country, email, password: hashedPassword,
    });

    const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        country: user.country,
        dob: user.dob,
        role: user.role,
      }
    });
  } catch (err) {
    console.error("Register error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        country: user.country,
        dob: user.dob,
        role: user.role,
      }
    });
  } catch (err) {
    console.error("Login error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ ME (kendi bilgilerini getir)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("GetMe error", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🆕 Helper function to update contributor names across all games
const updateContributorNamesInGames = async (userId, oldUsername, newUsername) => {
  try {
    console.log(`🔄 Updating contributor names from "${oldUsername}" to "${newUsername}" for user ${userId}`);

    // Find all games where this user is a contributor
    const gamesWithUser = await Game.find({
      "crewList.userId": userId
    });

    console.log(`📊 Found ${gamesWithUser.length} games where user is a contributor`);

    if (gamesWithUser.length === 0) {
      console.log("✅ No games found with this user as contributor, skipping update");
      return { updatedGames: 0, gamesList: [] };
    }

    let updatedCount = 0;
    const updatedGamesList = [];

    // Update each game individually for better control and logging
    for (const game of gamesWithUser) {
      let gameUpdated = false;

      // Update crewList entries for this user
      if (game.crewList && Array.isArray(game.crewList)) {
        game.crewList.forEach(crew => {
          if (crew.userId && crew.userId.toString() === userId.toString()) {
            if (crew.name !== newUsername) {
              console.log(`  🎮 Game "${game.title}": Updating "${crew.name}" → "${newUsername}"`);
              crew.name = newUsername;
              crew.updatedAt = new Date();
              gameUpdated = true;
            }
          }
        });
      }

      // Save if updated
      if (gameUpdated) {
        await game.save();
        updatedCount++;
        updatedGamesList.push({
          id: game._id,
          title: game.title
        });
      }
    }

    console.log(`✅ Updated contributor names in ${updatedCount} games`);

    return {
      updatedGames: updatedCount,
      gamesList: updatedGamesList
    };

  } catch (error) {
    console.error("❌ Error updating contributor names in games:", error);
    throw error;
  }
};

// ✅ UPDATE ME - Enhanced with username change detection and contributor update
exports.updateMe = async (req, res) => {
  try {
    console.log("🔄 updateMe incoming updates:", req.body);
    console.log("🔍 User ID from token:", req.user.id);

    // Get current user data for comparison
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Detect username change
    const isUsernameChanged = req.body.username && req.body.username !== currentUser.username;
    const oldUsername = currentUser.username;
    const newUsername = req.body.username;

    // Sadece modelde olan alanlara izin ver (güvenlik) - yeni alanlar eklendi
    const allowedFields = [
      "username", "title", "avatar", "bio", "website", "coverImage",
      "socials", "userTypes", "roles", "platforms", "favoriteGenres", "favoriteConsoles",
      "education", "currentWork", "currentProjects", "careerGoals"  // YENİ ALANLAR
    ];

    let updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    // Bio validasyonu
    if (updates.bio !== undefined) {
      if (typeof updates.bio !== 'string') {
        return res.status(400).json({
          message: "Bio must be a string",
          field: "bio"
        });
      }

      if (updates.bio.length > 500) {
        return res.status(400).json({
          message: "Bio cannot exceed 500 characters",
          field: "bio",
          currentLength: updates.bio.length,
          maxLength: 500
        });
      }

      if (updates.bio.trim() && updates.bio.trim().length < 50) {
        return res.status(400).json({
          message: "Bio should be at least 50 characters long",
          field: "bio",
          currentLength: updates.bio.trim().length,
          minLength: 50
        });
      }

      updates.bio = updates.bio.trim();
    }

    // Education validasyonu
    if (updates.education !== undefined) {
      if (typeof updates.education !== 'string') {
        return res.status(400).json({
          message: "Education must be a string",
          field: "education"
        });
      }

      if (updates.education.length > 200) {
        return res.status(400).json({
          message: "Education cannot exceed 200 characters",
          field: "education",
          currentLength: updates.education.length,
          maxLength: 200
        });
      }

      updates.education = updates.education.trim();
    }

    // Current Work validasyonu
    if (updates.currentWork !== undefined) {
      if (typeof updates.currentWork !== 'string') {
        return res.status(400).json({
          message: "Current work must be a string",
          field: "currentWork"
        });
      }

      if (updates.currentWork.length > 200) {
        return res.status(400).json({
          message: "Current work cannot exceed 200 characters",
          field: "currentWork",
          currentLength: updates.currentWork.length,
          maxLength: 200
        });
      }

      updates.currentWork = updates.currentWork.trim();
    }

    // Current Projects validasyonu
    if (updates.currentProjects !== undefined) {
      if (typeof updates.currentProjects !== 'string') {
        return res.status(400).json({
          message: "Current projects must be a string",
          field: "currentProjects"
        });
      }

      if (updates.currentProjects.length > 300) {
        return res.status(400).json({
          message: "Current projects cannot exceed 300 characters",
          field: "currentProjects",
          currentLength: updates.currentProjects.length,
          maxLength: 300
        });
      }

      updates.currentProjects = updates.currentProjects.trim();
    }

    // Career Goals validasyonu
    if (updates.careerGoals !== undefined) {
      if (typeof updates.careerGoals !== 'string') {
        return res.status(400).json({
          message: "Career goals must be a string",
          field: "careerGoals"
        });
      }

      if (updates.careerGoals.length > 250) {
        return res.status(400).json({
          message: "Career goals cannot exceed 250 characters",
          field: "careerGoals",
          currentLength: updates.careerGoals.length,
          maxLength: 250
        });
      }

      updates.careerGoals = updates.careerGoals.trim();
    }

    // Platforms validasyonu
    if (updates.platforms !== undefined) {
      if (!Array.isArray(updates.platforms)) {
        return res.status(400).json({
          message: "Platforms must be an array",
          field: "platforms"
        });
      }

      if (updates.platforms.length > 10) {
        return res.status(400).json({
          message: "Maximum 10 platforms allowed",
          field: "platforms",
          currentCount: updates.platforms.length,
          maxCount: 10
        });
      }

      const validatedPlatforms = [];
      const seenKeys = new Set();

      for (let i = 0; i < updates.platforms.length; i++) {
        const platform = updates.platforms[i];

        if (!platform || typeof platform !== 'object') {
          return res.status(400).json({
            message: `Platform at index ${i} must be an object`,
            field: "platforms"
          });
        }

        if (!platform.key || typeof platform.key !== 'string') {
          return res.status(400).json({
            message: `Platform at index ${i} must have a valid key`,
            field: "platforms"
          });
        }

        if (!platform.name || typeof platform.name !== 'string') {
          return res.status(400).json({
            message: `Platform at index ${i} must have a valid name`,
            field: "platforms"
          });
        }

        const normalizedKey = platform.key.toLowerCase().trim();

        if (seenKeys.has(normalizedKey)) {
          return res.status(400).json({
            message: `Duplicate platform: ${platform.name}`,
            field: "platforms"
          });
        }
        seenKeys.add(normalizedKey);

        const cleanPlatform = {
          key: normalizedKey,
          name: platform.name.trim(),
          verified: Boolean(platform.verified || false),
          username: (platform.username || "").toString().trim(),
          profileUrl: (platform.profileUrl || "").toString().trim(),
          addedAt: platform.addedAt || new Date()
        };

        validatedPlatforms.push(cleanPlatform);
      }

      updates.platforms = validatedPlatforms;
      console.log("✅ Platforms validated:", validatedPlatforms.length, "platforms");
    }

    // Favorite Genres validasyonu
    if (updates.favoriteGenres !== undefined) {
      if (!Array.isArray(updates.favoriteGenres)) {
        return res.status(400).json({
          message: "Favorite genres must be an array",
          field: "favoriteGenres"
        });
      }

      if (updates.favoriteGenres.length > 15) {
        return res.status(400).json({
          message: "Maximum 15 genres allowed",
          field: "favoriteGenres",
          currentCount: updates.favoriteGenres.length,
          maxCount: 15
        });
      }

      const validatedGenres = [];
      const seenGenres = new Set();

      for (let i = 0; i < updates.favoriteGenres.length; i++) {
        const genre = updates.favoriteGenres[i];

        // String olarak gönderilmişse objeye çevir
        let genreObj;
        if (typeof genre === 'string') {
          genreObj = {
            name: genre,
            key: genre.toLowerCase().trim(),
            color: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'][i % 6],
            percentage: Math.floor(Math.random() * 30) + 10
          };
        } else if (genre && typeof genre === 'object') {
          genreObj = {
            name: genre.name || genre.key || '',
            key: (genre.key || genre.name || '').toLowerCase().trim(),
            color: genre.color || '#8B5CF6',
            percentage: genre.percentage || 0
          };
        } else {
          continue; // Geçersiz genre'yi atla
        }

        if (!genreObj.name || !genreObj.key) {
          continue; // Boş genre'yi atla
        }

        if (seenGenres.has(genreObj.key)) {
          continue; // Duplicate genre'yi atla
        }
        seenGenres.add(genreObj.key);

        validatedGenres.push(genreObj);
      }

      updates.favoriteGenres = validatedGenres;
      console.log("✅ Genres validated:", validatedGenres.length, "genres");
    }

    // Favorite Consoles validasyonu
    if (updates.favoriteConsoles !== undefined) {
      if (!Array.isArray(updates.favoriteConsoles)) {
        return res.status(400).json({
          message: "Favorite consoles must be an array",
          field: "favoriteConsoles"
        });
      }

      if (updates.favoriteConsoles.length > 20) {
        return res.status(400).json({
          message: "Maximum 20 consoles allowed",
          field: "favoriteConsoles",
          currentCount: updates.favoriteConsoles.length,
          maxCount: 20
        });
      }

      const validatedConsoles = [];
      const seenConsoles = new Set();

      for (let i = 0; i < updates.favoriteConsoles.length; i++) {
        const console = updates.favoriteConsoles[i];

        // String olarak gönderilmişse objeye çevir
        let consoleObj;
        if (typeof console === 'string') {
          consoleObj = {
            name: console,
            key: console.toLowerCase().trim(),
            generation: 'Unknown',
            addedAt: new Date()
          };
        } else if (console && typeof console === 'object') {
          consoleObj = {
            name: console.name || console.key || '',
            key: (console.key || console.name || '').toLowerCase().trim(),
            generation: console.generation || 'Unknown',
            addedAt: console.addedAt || new Date()
          };
        } else {
          continue; // Geçersiz console'u atla
        }

        if (!consoleObj.name || !consoleObj.key) {
          continue; // Boş console'u atla
        }

        if (seenConsoles.has(consoleObj.key)) {
          continue; // Duplicate console'u atla
        }
        seenConsoles.add(consoleObj.key);

        validatedConsoles.push(consoleObj);
      }

      updates.favoriteConsoles = validatedConsoles;
      console.log("✅ Consoles validated:", validatedConsoles.length, "consoles");
    }

    // "roles" array handling
    if (Array.isArray(updates.roles) && typeof updates.roles[0] === "string") {
      updates.roles = updates.roles.map(r => ({ name: r }));
    }

    // "socials" array validation
    if (updates.socials && Array.isArray(updates.socials)) {
      updates.socials = updates.socials.filter(s => s.platform && s.link);
    }

    // "userTypes" array validation
    if (updates.userTypes && Array.isArray(updates.userTypes)) {
      updates.userTypes = updates.userTypes.filter(t => t && typeof t === 'string');
    }

    console.log("🔄 Processed updates:", Object.keys(updates));

    // Username change validation
    if (isUsernameChanged) {
      console.log(`📝 Username change detected: "${oldUsername}" → "${newUsername}"`);

      // Check if new username is already taken by another user
      const existingUser = await User.findOne({
        username: newUsername,
        _id: { $ne: req.user.id }
      });

      if (existingUser) {
        return res.status(400).json({
          message: "Username is already taken by another user",
          field: "username"
        });
      }
    }

    // Kullanıcıyı güncelle
    const user = await User.findByIdAndUpdate(
        req.user.id,
        updates,
        {
          new: true,
          runValidators: true
        }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🆕 UPDATE CONTRIBUTOR NAMES IN GAMES IF USERNAME CHANGED
    let contributorUpdateResult = null;
    if (isUsernameChanged) {
      try {
        contributorUpdateResult = await updateContributorNamesInGames(
            req.user.id,
            oldUsername,
            newUsername
        );

        console.log(`✅ Contributor update completed:`, contributorUpdateResult);
      } catch (error) {
        console.error("❌ Failed to update contributor names, but user profile was updated:", error);
        // Don't fail the whole request, just log the error
        contributorUpdateResult = {
          error: "Failed to update contributor names in some games",
          updatedGames: 0,
          gamesList: []
        };
      }
    }

    console.log("✅ User successfully updated:", {
      id: user._id,
      username: user.username,
      updatedFields: Object.keys(updates),
      platformCount: user.platforms?.length || 0,
      genreCount: user.favoriteGenres?.length || 0,
      consoleCount: user.favoriteConsoles?.length || 0,
      hasEducation: !!user.education,
      hasCurrentWork: !!user.currentWork,
      hasCurrentProjects: !!user.currentProjects,
      hasCareerGoals: !!user.careerGoals,
      usernameChanged: isUsernameChanged,
      contributorGamesUpdated: contributorUpdateResult?.updatedGames || 0
    });

    // Enhanced response with contributor update info
    const response = {
      message: "Profile updated successfully",
      user: user,
      updatedFields: Object.keys(updates)
    };

    // Add contributor update info if username was changed
    if (isUsernameChanged && contributorUpdateResult) {
      response.contributorUpdate = {
        updated: contributorUpdateResult.updatedGames > 0,
        gamesCount: contributorUpdateResult.updatedGames,
        gamesList: contributorUpdateResult.gamesList,
        error: contributorUpdateResult.error || null
      };

      if (contributorUpdateResult.updatedGames > 0) {
        response.message = `Profile updated successfully! Your contributor name has been updated in ${contributorUpdateResult.updatedGames} game(s).`;
      } else if (contributorUpdateResult.error) {
        response.message = "Profile updated successfully, but there was an issue updating your contributor credits. Please contact support if this persists.";
      }
    }

    res.json(response);

  } catch (err) {
    console.error("❌ updateMe error:", err);

    // Mongoose validation error handling
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));

      return res.status(400).json({
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        message: `${field} already exists`,
        field: field
      });
    }

    res.status(500).json({
      message: "Update failed",
      error: err.message
    });
  }
};