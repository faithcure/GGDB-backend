const mongoose = require("mongoose");
const Connection = require("../models/Connection");
const User = require("../models/User");
const UserActivity = require("../models/UserActivity");

// Send follow/friend request
const sendConnectionRequest = async (req, res) => {
  try {
    const { recipientId, connectionType = "follow" } = req.body;
    const requesterId = req.user.id;

    // Validate input
    if (!recipientId) {
      return res.status(400).json({ error: "Recipient ID is required" });
    }

    if (requesterId === recipientId) {
      return res.status(400).json({ error: "Cannot connect to yourself" });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId }
      ]
    });

    if (existingConnection) {
      return res.status(409).json({ 
        error: "Connection already exists",
        connection: existingConnection
      });
    }

    // Create new connection
    const connection = new Connection({
      requester: requesterId,
      recipient: recipientId,
      connectionType,
      status: connectionType === "follow" ? "accepted" : "pending",
      source: req.body.source || "direct"
    });

    await connection.save();

    // Create activity record
    await UserActivity.create({
      userId: requesterId,
      activityType: connectionType === "follow" ? "follow" : "friend_request",
      targetUserId: recipientId,
      metadata: {
        connectionType,
        username: recipient.username
      }
    });

    // Populate connection for response
    const populatedConnection = await Connection.findById(connection._id)
      .populate('requester', 'username avatar')
      .populate('recipient', 'username avatar');

    res.status(201).json({
      message: `${connectionType === "follow" ? "Following" : "Friend request sent"} successfully`,
      connection: populatedConnection
    });

  } catch (error) {
    console.error("Connection request error:", error);
    res.status(500).json({ error: "Failed to send connection request" });
  }
};

// Accept connection request
const acceptConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user.id;

    const connection = await Connection.findOne({
      _id: connectionId,
      recipient: userId,
      status: "pending"
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection request not found" });
    }

    connection.status = "accepted";
    await connection.save();

    // Create activity record
    await UserActivity.create({
      userId: userId,
      activityType: "connection_accepted",
      targetUserId: connection.requester,
      metadata: {
        connectionType: connection.connectionType
      }
    });

    // Populate for response
    const populatedConnection = await Connection.findById(connection._id)
      .populate('requester', 'username avatar')
      .populate('recipient', 'username avatar');

    res.json({
      message: "Connection request accepted",
      connection: populatedConnection
    });

  } catch (error) {
    console.error("Accept connection error:", error);
    res.status(500).json({ error: "Failed to accept connection request" });
  }
};

// Reject connection request
const rejectConnectionRequest = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user.id;

    const connection = await Connection.findOneAndUpdate(
      {
        _id: connectionId,
        recipient: userId,
        status: "pending"
      },
      { status: "rejected" },
      { new: true }
    );

    if (!connection) {
      return res.status(404).json({ error: "Connection request not found" });
    }

    res.json({ message: "Connection request rejected" });

  } catch (error) {
    console.error("Reject connection error:", error);
    res.status(500).json({ error: "Failed to reject connection request" });
  }
};

// Remove/unfollow connection
const removeConnection = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user.id;

    const connection = await Connection.findOne({
      _id: connectionId,
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    await Connection.findByIdAndDelete(connectionId);

    // If it was a mutual follow, update the reverse connection
    if (connection.isMutual) {
      const reverseConnection = await Connection.findOne({
        requester: connection.recipient,
        recipient: connection.requester,
        connectionType: "follow"
      });
      
      if (reverseConnection) {
        reverseConnection.isMutual = false;
        await reverseConnection.save();
      }
    }

    res.json({ message: "Connection removed successfully" });

  } catch (error) {
    console.error("Remove connection error:", error);
    res.status(500).json({ error: "Failed to remove connection" });
  }
};

// Get user connections
const getUserConnections = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = "all", status = "accepted", page = 1, limit = 20 } = req.query;

    const query = {
      $or: [
        { requester: userId },
        { recipient: userId }
      ],
      status: status
    };

    if (type !== "all") {
      query.connectionType = type;
    }

    const connections = await Connection.find(query)
      .populate('requester', 'username avatar bio gameStats')
      .populate('recipient', 'username avatar bio gameStats')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Transform data to show the "other" user
    const transformedConnections = connections.map(conn => {
      const isRequester = conn.requester._id.toString() === userId;
      const otherUser = isRequester ? conn.recipient : conn.requester;
      
      return {
        ...conn.toObject(),
        connectedUser: otherUser,
        isRequester
      };
    });

    const total = await Connection.countDocuments(query);

    res.json({
      connections: transformedConnections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get connections error:", error);
    res.status(500).json({ error: "Failed to fetch connections" });
  }
};

// Get connection suggestions
const getConnectionSuggestions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // Get current user's data for similarity matching
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Get existing connections to exclude
    const existingConnections = await Connection.find({
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    });

    const connectedUserIds = existingConnections.map(conn => 
      conn.requester.toString() === userId ? conn.recipient.toString() : conn.requester.toString()
    );
    connectedUserIds.push(userId.toString()); // Exclude self

    // Find potential connections based on:
    // 1. Common gaming preferences
    // 2. Mutual connections
    // 3. Similar activity patterns
    const suggestions = await User.aggregate([
      {
        $match: {
          _id: { $nin: connectedUserIds.map(id => new mongoose.Types.ObjectId(id)) },
          $and: [
            {
              $or: [
                { banned: { $exists: false } },
                { banned: { $ne: true } }
              ]
            },
            {
              $or: [
                { deleted: { $exists: false } },
                { deleted: { $ne: true } }
              ]
            }
          ]
        }
      },
      {
        $addFields: {
          // Calculate similarity score
          similarityScore: {
            $add: [
              // Common genres score
              {
                $size: {
                  $setIntersection: [
                    { $ifNull: ['$favoriteGenres.name', []] },
                    (currentUser.favoriteGenres || []).map(g => g.name)
                  ]
                }
              },
              // Common platforms score
              {
                $size: {
                  $setIntersection: [
                    { $ifNull: ['$platforms.key', []] },
                    (currentUser.platforms || []).map(p => p.key)
                  ]
                }
              }
            ]
          }
        }
      },
      {
        $match: {
          similarityScore: { $gte: 0 }
        }
      },
      {
        $sort: { similarityScore: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          username: 1,
          avatar: 1,
          bio: 1,
          'gameStats.totalGames': 1,
          'favoriteGenres': 1,
          'platforms': 1,
          similarityScore: 1
        }
      }
    ]);

    // If no suggestions found, get random active users
    if (suggestions.length === 0) {
      const fallbackSuggestions = await User.find({
        _id: { $nin: connectedUserIds.map(id => new mongoose.Types.ObjectId(id)) },
        $and: [
          {
            $or: [
              { banned: { $exists: false } },
              { banned: { $ne: true } }
            ]
          },
          {
            $or: [
              { deleted: { $exists: false } },
              { deleted: { $ne: true } }
            ]
          }
        ]
      })
      .select('username avatar bio gameStats.totalGames')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

      return res.json({
        suggestions: fallbackSuggestions.map(user => ({
          ...user.toObject(),
          similarityScore: 0
        })),
        total: fallbackSuggestions.length
      });
    }

    res.json({
      suggestions,
      total: suggestions.length
    });

  } catch (error) {
    console.error("Get suggestions error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to fetch connection suggestions",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get mutual connections
const getMutualConnections = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const mutualConnections = await Connection.findMutualConnections(currentUserId, userId);

    res.json({
      mutualConnections,
      count: mutualConnections.length
    });

  } catch (error) {
    console.error("Get mutual connections error:", error);
    res.status(500).json({ error: "Failed to fetch mutual connections" });
  }
};

// Update connection strength (called on interactions)
const updateConnectionStrength = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { interactionType = "view" } = req.body;
    const userId = req.user.id;

    const connection = await Connection.findOne({
      _id: connectionId,
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    await connection.updateStrength(interactionType);

    res.json({
      message: "Connection strength updated",
      strength: connection.strength
    });

  } catch (error) {
    console.error("Update connection strength error:", error);
    res.status(500).json({ error: "Failed to update connection strength" });
  }
};

// Get pending connection requests
const getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = "received" } = req.query;

    const query = type === "received" 
      ? { recipient: userId, status: "pending" }
      : { requester: userId, status: "pending" };

    const requests = await Connection.find(query)
      .populate(type === "received" ? 'requester' : 'recipient', 'username avatar bio')
      .sort({ createdAt: -1 });

    res.json({
      requests,
      count: requests.length
    });

  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({ error: "Failed to fetch pending requests" });
  }
};

module.exports = {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  getUserConnections,
  getConnectionSuggestions,
  getMutualConnections,
  updateConnectionStrength,
  getPendingRequests
};