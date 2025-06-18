// 📁 routes/userRoutes.js - Enhanced with roles array support
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Game = require("../models/Game");

// 🆕 Helper function to extract user roles from game contributions
const extractUserRolesFromGame = (game, userId) => {
    const userContribution = game.crewList.find(crew =>
        crew.userId && crew.userId.toString() === userId
    );

    if (!userContribution) return null;

    // 🆕 NEW FORMAT: Use roles array
    if (userContribution.roles && userContribution.roles.length > 0) {
        return {
            roles: userContribution.roles,
            // Legacy format for backward compatibility
            userRole: userContribution.roles.map(r => r.name).join(' & '),
            department: userContribution.roles[0].department, // Primary department
            allDepartments: userContribution.roles.map(r => r.department)
        };
    }

    // 🔧 BACKWARD COMPATIBILITY: Use old format
    if (userContribution.role) {
        return {
            roles: [{
                name: userContribution.role,
                department: userContribution.department || 'Other'
            }],
            userRole: userContribution.role,
            department: userContribution.department || 'Other',
            allDepartments: [userContribution.department || 'Other']
        };
    }

    return null;
};

// 🆕 Helper function to infer game status
const inferGameStatus = (game) => {
    const currentYear = new Date().getFullYear();
    const releaseYear = game.releaseDate ? new Date(game.releaseDate).getFullYear() : null;

    if (!releaseYear) return "In Development";
    if (releaseYear > currentYear) return "Upcoming Release";
    if (releaseYear === currentYear) return "Recently Released";
    return "Released";
};

// 🆕 Helper function to calculate contribution statistics
const calculateContributionStats = (contributions) => {
    const stats = {
        totalProjects: contributions.length,
        departmentBreakdown: {},
        roleBreakdown: {},
        averageRating: 0,
        recentActivity: null,
        platformsWorkedOn: new Set(),
        genresWorkedOn: new Set(),
        upcomingProjects: 0,
        completedProjects: 0
    };

    contributions.forEach(contrib => {
        // Department stats (handle multiple departments per contribution)
        if (contrib.allDepartments) {
            contrib.allDepartments.forEach(dept => {
                stats.departmentBreakdown[dept] = (stats.departmentBreakdown[dept] || 0) + 1;
            });
        }

        // Role stats (handle multiple roles per contribution)
        if (contrib.roles) {
            contrib.roles.forEach(role => {
                stats.roleBreakdown[role.name] = (stats.roleBreakdown[role.name] || 0) + 1;
            });
        }

        // Platform and genre tracking
        if (contrib.platforms) contrib.platforms.forEach(p => stats.platformsWorkedOn.add(p));
        if (contrib.genres) contrib.genres.forEach(g => stats.genresWorkedOn.add(g));

        // Project status tracking
        if (contrib.status && (contrib.status.includes("Development") || contrib.status.includes("Upcoming"))) {
            stats.upcomingProjects++;
        } else {
            stats.completedProjects++;
        }
    });

    // Calculate average rating
    const ratedProjects = contributions.filter(c => c.ggdbRating && c.ggdbRating > 0);
    if (ratedProjects.length > 0) {
        stats.averageRating = parseFloat(
            (ratedProjects.reduce((sum, c) => sum + c.ggdbRating, 0) / ratedProjects.length).toFixed(1)
        );
    }

    // Recent activity
    if (contributions.length > 0) {
        stats.recentActivity = contributions[0].contributionDate || contributions[0].updatedAt;
    }

    // Convert Sets to Arrays
    stats.platformsWorkedOn = Array.from(stats.platformsWorkedOn);
    stats.genresWorkedOn = Array.from(stats.genresWorkedOn);

    return stats;
};

// GET /api/users/:userId/contributions - Enhanced with roles array support
router.get('/:userId/contributions', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { includeStats = false, department = null, role = null } = req.query;

        console.log("🔍 Looking for contributions for userId:", userId);

        // Build query for filtering
        let query = { 'crewList.userId': new mongoose.Types.ObjectId(userId) };

        // 🆕 Filter by department if specified
        if (department) {
            query.$or = [
                { 'crewList.roles.department': new RegExp(department, 'i') },
                { 'crewList.department': new RegExp(department, 'i') } // Backward compatibility
            ];
        }

        // 🆕 Filter by role if specified
        if (role) {
            query.$or = [
                { 'crewList.roles.name': new RegExp(role, 'i') },
                { 'crewList.role': new RegExp(role, 'i') } // Backward compatibility
            ];
        }

        // Find games where user is in crewList
        const games = await Game.find(query)
            .select('title coverImage releaseDate crewList updatedAt createdAt ggdbRating genres platforms')
            .sort({ updatedAt: -1 }); // Sort by most recent contributions

        console.log("📊 Found games:", games.length);

        // Extract user's detailed contributions from each game
        const contributions = games.map(game => {
            const userRoleData = extractUserRolesFromGame(game, userId);

            if (!userRoleData) {
                console.warn(`⚠️ No role data found for user ${userId} in game ${game.title}`);
                return null;
            }

            console.log(`🎮 Game: ${game.title}, User roles: ${userRoleData.userRole}, Departments: ${userRoleData.allDepartments.join(', ')}`);

            return {
                _id: game._id,
                title: game.title,
                coverImage: game.coverImage,
                releaseDate: game.releaseDate,

                // 🆕 Enhanced role and department info
                roles: userRoleData.roles,                    // Array of {name, department}
                userRole: userRoleData.userRole,              // "VFX Artist & Game Developer"
                department: userRoleData.department,          // Primary department
                allDepartments: userRoleData.allDepartments,  // All departments user worked in

                // 🆕 Additional game metadata
                ggdbRating: game.ggdbRating,
                genres: game.genres || [],
                platforms: game.platforms || [],

                // 🆕 Contribution metadata
                contributionDate: game.updatedAt,

                // Existing fields
                updatedAt: game.updatedAt,
                createdAt: game.createdAt,

                // 🆕 Status inference
                status: inferGameStatus(game)
            };
        }).filter(contrib => contrib !== null); // Remove null entries

        // 🆕 Optional: Include user contribution statistics
        let stats = null;
        if (includeStats === 'true') {
            stats = calculateContributionStats(contributions);
        }

        console.log("✅ Returning contributions:", contributions.length);

        const response = { contributions };
        if (stats) response.stats = stats;

        res.json(response);
    } catch (error) {
        console.error('❌ Contributions fetch error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🆕 GET /api/users/:userId/contributions/by-department - Enhanced department breakdown
router.get('/:userId/contributions/by-department', async (req, res) => {
    try {
        const userId = req.params.userId;

        const games = await Game.find({
            'crewList.userId': new mongoose.Types.ObjectId(userId)
        }).select('title coverImage releaseDate crewList ggdbRating');

        const departmentContributions = {};

        games.forEach(game => {
            const userRoleData = extractUserRolesFromGame(game, userId);

            if (userRoleData && userRoleData.roles) {
                userRoleData.roles.forEach(roleData => {
                    const dept = roleData.department || 'Other';

                    if (!departmentContributions[dept]) {
                        departmentContributions[dept] = [];
                    }

                    // Check if this game is already added to this department
                    const existingEntry = departmentContributions[dept].find(entry =>
                        entry.gameId.toString() === game._id.toString()
                    );

                    if (existingEntry) {
                        // Add role to existing entry
                        if (!existingEntry.roles.includes(roleData.name)) {
                            existingEntry.roles.push(roleData.name);
                            existingEntry.role = existingEntry.roles.join(' & ');
                        }
                    } else {
                        // Create new entry
                        departmentContributions[dept].push({
                            gameId: game._id,
                            title: game.title,
                            coverImage: game.coverImage,
                            roles: [roleData.name],
                            role: roleData.name,
                            rating: game.ggdbRating
                        });
                    }
                });
            }
        });

        res.json({ departmentContributions });
    } catch (error) {
        console.error('❌ Department contributions fetch error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🆕 GET /api/users/:userId/contributions/stats - Detailed statistics
router.get('/:userId/contributions/stats', async (req, res) => {
    try {
        const userId = req.params.userId;

        const games = await Game.find({
            'crewList.userId': new mongoose.Types.ObjectId(userId)
        }).select('title crewList ggdbRating genres platforms releaseDate updatedAt');

        const contributions = games.map(game => {
            const userRoleData = extractUserRolesFromGame(game, userId);
            return userRoleData ? {
                ...userRoleData,
                ggdbRating: game.ggdbRating,
                genres: game.genres,
                platforms: game.platforms,
                status: inferGameStatus(game),
                updatedAt: game.updatedAt
            } : null;
        }).filter(contrib => contrib !== null);

        const stats = calculateContributionStats(contributions);

        res.json({ stats });
    } catch (error) {
        console.error('❌ Stats fetch error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// 🆕 GET /api/users/:userId/contributions/search - Search contributions
router.get('/:userId/contributions/search', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { q, department, role, limit = 10 } = req.query;

        let query = { 'crewList.userId': new mongoose.Types.ObjectId(userId) };

        // Add search filters
        const searchConditions = [];

        if (q) {
            searchConditions.push({ title: new RegExp(q, 'i') });
        }

        if (department) {
            searchConditions.push({
                $or: [
                    { 'crewList.roles.department': new RegExp(department, 'i') },
                    { 'crewList.department': new RegExp(department, 'i') }
                ]
            });
        }

        if (role) {
            searchConditions.push({
                $or: [
                    { 'crewList.roles.name': new RegExp(role, 'i') },
                    { 'crewList.role': new RegExp(role, 'i') }
                ]
            });
        }

        if (searchConditions.length > 0) {
            query.$and = searchConditions;
        }

        const games = await Game.find(query)
            .select('title coverImage crewList ggdbRating')
            .limit(parseInt(limit))
            .sort({ updatedAt: -1 });

        const results = games.map(game => {
            const userRoleData = extractUserRolesFromGame(game, userId);
            return {
                gameId: game._id,
                title: game.title,
                coverImage: game.coverImage,
                rating: game.ggdbRating,
                ...userRoleData
            };
        }).filter(result => result.roles);

        res.json({ results });
    } catch (error) {
        console.error('❌ Search contributions error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;