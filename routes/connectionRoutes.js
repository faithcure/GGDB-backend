const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
  reviewLimiter,
  searchLimiter 
} = require("../middleware/rateLimitMiddleware");

const {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  getUserConnections,
  getConnectionSuggestions,
  getMutualConnections,
  updateConnectionStrength,
  getPendingRequests
} = require("../controllers/connectionController");

// All routes require authentication
router.use(authMiddleware);

// Send connection request (follow/friend)
router.post("/request", reviewLimiter, sendConnectionRequest);

// Accept connection request
router.put("/:connectionId/accept", acceptConnectionRequest);

// Reject connection request
router.put("/:connectionId/reject", rejectConnectionRequest);

// Remove/unfollow connection
router.delete("/:connectionId", removeConnection);

// Get user connections
router.get("/user/:userId", getUserConnections);

// Get connection suggestions
router.get("/suggestions", searchLimiter, getConnectionSuggestions);

// Get mutual connections between two users
router.get("/mutual/:userId", getMutualConnections);

// Update connection strength (on interaction)
router.put("/:connectionId/strength", updateConnectionStrength);

// Get pending connection requests
router.get("/pending", getPendingRequests);

module.exports = router;