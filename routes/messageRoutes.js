const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
  reviewLimiter,
  apiLimiter 
} = require("../middleware/rateLimitMiddleware");

const {
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markConversationAsRead,
  deleteMessage,
  editMessage,
  addReaction,
  shareGame,
  getUnreadCount
} = require("../controllers/messageController");

// All routes require authentication
router.use(authMiddleware);

// Send a new message
router.post("/send", reviewLimiter, sendMessage);

// Get user conversations
router.get("/conversations", getUserConversations);

// Get conversation messages
router.get("/conversation/:conversationId", getConversationMessages);

// Mark conversation as read
router.put("/conversation/:conversationId/read", markConversationAsRead);

// Delete message
router.delete("/:messageId", deleteMessage);

// Edit message
router.put("/:messageId", editMessage);

// Add reaction to message
router.post("/:messageId/reaction", addReaction);

// Share game in message
router.post("/share-game", reviewLimiter, shareGame);

// Get unread message count
router.get("/unread-count", getUnreadCount);

module.exports = router;