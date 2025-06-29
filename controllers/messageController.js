const mongoose = require("mongoose");
const Message = require("../models/Message");
const Connection = require("../models/Connection");
const User = require("../models/User");

// Send a new message
const sendMessage = async (req, res) => {
  try {
    const { recipientId, content, type = "text", gameReference } = req.body;
    const senderId = req.user.id;

    // Validate input
    if (!recipientId || !content.text) {
      return res.status(400).json({ error: "Recipient and message content are required" });
    }

    if (senderId === recipientId) {
      return res.status(400).json({ error: "Cannot message yourself" });
    }

    // Check if users are connected (optional - can be removed for open messaging)
    const connection = await Connection.findOne({
      $or: [
        { requester: senderId, recipient: recipientId, status: "accepted" },
        { requester: recipientId, recipient: senderId, status: "accepted" }
      ]
    });

    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found" });
    }

    // Create message
    const participants = [senderId, recipientId];
    const conversationId = Message.generateConversationId(participants);

    const message = new Message({
      participants,
      sender: senderId,
      conversationId,
      content: {
        text: content.text,
        type,
        attachments: content.attachments || [],
        gameReference
      }
    });

    await message.save();

    // Populate message for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('participants', 'username avatar')
      .populate('content.gameReference.gameId', 'title coverImage');

    // Update connection strength if they're connected
    if (connection) {
      await connection.updateStrength('message');
    }

    res.status(201).json({
      message: "Message sent successfully",
      data: populatedMessage
    });

  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// Get conversation messages
const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    // Verify user is participant in conversation
    const userInConversation = await Message.findOne({
      conversationId,
      participants: userId
    });

    if (!userInConversation) {
      return res.status(403).json({ error: "Access denied to this conversation" });
    }

    const messages = await Message.getConversationMessages(
      conversationId, 
      parseInt(page), 
      parseInt(limit)
    );

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    const total = await Message.countDocuments({ conversationId });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get conversation messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// Get user conversations
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await Message.getUserConversations(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    res.json({
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: conversations.length
      }
    });

  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

// Mark conversation as read
const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify user is participant
    const userInConversation = await Message.findOne({
      conversationId,
      participants: userId
    });

    if (!userInConversation) {
      return res.status(403).json({ error: "Access denied to this conversation" });
    }

    // Mark all unread messages as read
    const result = await Message.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        'readBy.user': { $ne: userId }
      },
      {
        $push: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      }
    );

    res.json({
      message: "Conversation marked as read",
      messagesUpdated: result.modifiedCount
    });

  } catch (error) {
    console.error("Mark conversation as read error:", error);
    res.status(500).json({ error: "Failed to mark conversation as read" });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findOne({
      _id: messageId,
      sender: userId
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found or access denied" });
    }

    // Don't actually delete, just mark as deleted
    message.status = "deleted";
    message.content.text = "This message was deleted";
    await message.save();

    res.json({ message: "Message deleted successfully" });

  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// Edit message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.text) {
      return res.status(400).json({ error: "Message content is required" });
    }

    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      status: { $ne: "deleted" }
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found or access denied" });
    }

    // Check if message is not too old (e.g., 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ error: "Message is too old to edit" });
    }

    message.content.text = content.text;
    message.metadata.edited = true;
    message.metadata.editedAt = new Date();

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar');

    res.json({
      message: "Message updated successfully",
      data: populatedMessage
    });

  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

// Add reaction to message
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({ error: "Emoji is required" });
    }

    const message = await Message.findOne({
      _id: messageId,
      participants: userId
    });

    if (!message) {
      return res.status(404).json({ error: "Message not found or access denied" });
    }

    await message.addReaction(userId, emoji);

    res.json({
      message: "Reaction added successfully",
      reactions: message.metadata.reactions
    });

  } catch (error) {
    console.error("Add reaction error:", error);
    res.status(500).json({ error: "Failed to add reaction" });
  }
};

// Share game in message
const shareGame = async (req, res) => {
  try {
    const { recipientId, gameId, message: messageText = "" } = req.body;
    const senderId = req.user.id;

    // Get game details
    const Game = require("../models/Game");
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Create message with game reference
    const participants = [senderId, recipientId];
    const conversationId = Message.generateConversationId(participants);

    const message = new Message({
      participants,
      sender: senderId,
      conversationId,
      content: {
        text: messageText || `Check out this game: ${game.title}`,
        type: "game_share",
        gameReference: {
          gameId: game._id,
          gameTitle: game.title,
          gameImage: game.coverImage,
          context: "recommendation"
        }
      }
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('content.gameReference.gameId', 'title coverImage ggdbRating');

    res.status(201).json({
      message: "Game shared successfully",
      data: populatedMessage
    });

  } catch (error) {
    console.error("Share game error:", error);
    res.status(500).json({ error: "Failed to share game" });
  }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const unreadCount = await Message.countDocuments({
      participants: userId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
      status: { $ne: "deleted" }
    });

    res.json({ unreadCount });

  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
};

module.exports = {
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markConversationAsRead,
  deleteMessage,
  editMessage,
  addReaction,
  shareGame,
  getUnreadCount
};