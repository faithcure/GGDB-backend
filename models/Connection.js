const mongoose = require("mongoose");

const connectionSchema = new mongoose.Schema({
  // Who initiated the connection
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Who received the connection request
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Connection type
  connectionType: {
    type: String,
    enum: ["follow", "friend", "block"],
    default: "follow"
  },
  
  // Connection status
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "blocked"],
    default: "pending"
  },
  
  // Mutual connection (both users follow each other)
  isMutual: {
    type: Boolean,
    default: false
  },
  
  // Connection strength (based on interactions)
  strength: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Last interaction timestamp
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  
  // Interaction count
  interactionCount: {
    type: Number,
    default: 0
  },
  
  // Connection tags (gaming preferences, common interests)
  tags: [String],
  
  // Privacy settings
  privacy: {
    showInFeed: {
      type: Boolean,
      default: true
    },
    allowMessages: {
      type: Boolean,
      default: true
    },
    shareActivity: {
      type: Boolean,
      default: true
    }
  },
  
  // Connection source (how they found each other)
  source: {
    type: String,
    enum: ["search", "suggestion", "game", "review", "mutual_friend", "direct"],
    default: "direct"
  },
  
  // Notes about the connection (private)
  notes: {
    type: String,
    maxlength: 500,
    default: ""
  },
  
  // Connection metadata
  metadata: {
    commonGames: [String],
    commonGenres: [String],
    commonPlatforms: [String],
    mutualConnections: Number
  }
}, {
  timestamps: true
});

// Compound indexes for performance
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });
connectionSchema.index({ requester: 1, status: 1 });
connectionSchema.index({ recipient: 1, status: 1 });
connectionSchema.index({ connectionType: 1, status: 1 });
connectionSchema.index({ strength: -1 });
connectionSchema.index({ lastInteraction: -1 });

// Virtual for connection display name
connectionSchema.virtual('displayStatus').get(function() {
  if (this.connectionType === 'follow') {
    return this.status === 'accepted' ? 'Following' : 'Follow Request';
  }
  if (this.connectionType === 'friend') {
    return this.status === 'accepted' ? 'Friends' : 'Friend Request';
  }
  if (this.connectionType === 'block') {
    return 'Blocked';
  }
  return this.status;
});

// Static method to find mutual connections
connectionSchema.statics.findMutualConnections = function(userId1, userId2) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { requester: new mongoose.Types.ObjectId(userId1), status: 'accepted' },
          { recipient: new mongoose.Types.ObjectId(userId1), status: 'accepted' }
        ]
      }
    },
    {
      $addFields: {
        connectedUser: {
          $cond: {
            if: { $eq: ['$requester', new mongoose.Types.ObjectId(userId1)] },
            then: '$recipient',
            else: '$requester'
          }
        }
      }
    },
    {
      $lookup: {
        from: 'connections',
        let: { connectedUserId: '$connectedUser' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$requester', '$$connectedUserId'] },
                          { $eq: ['$recipient', new mongoose.Types.ObjectId(userId2)] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$recipient', '$$connectedUserId'] },
                          { $eq: ['$requester', new mongoose.Types.ObjectId(userId2)] }
                        ]
                      }
                    ]
                  },
                  { $eq: ['$status', 'accepted'] }
                ]
              }
            }
          }
        ],
        as: 'mutualConnection'
      }
    },
    {
      $match: {
        'mutualConnection.0': { $exists: true }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'connectedUser',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    {
      $project: {
        userId: '$connectedUser',
        username: { $arrayElemAt: ['$userInfo.username', 0] },
        avatar: { $arrayElemAt: ['$userInfo.avatar', 0] }
      }
    }
  ]);
};

// Static method to get connection suggestions
connectionSchema.statics.getConnectionSuggestions = function(userId, limit = 10) {
  return this.aggregate([
    // Find users with similar gaming preferences
    {
      $lookup: {
        from: 'users',
        localField: 'recipient',
        foreignField: '_id',
        as: 'recipientUser'
      }
    },
    {
      $lookup: {
        from: 'users',
        let: { currentUserId: new mongoose.Types.ObjectId(userId) },
        pipeline: [
          { $match: { $expr: { $eq: ['$_id', '$$currentUserId'] } } }
        ],
        as: 'currentUser'
      }
    },
    // Add more complex aggregation logic here for suggestions
    { $limit: limit }
  ]);
};

// Instance method to update connection strength
connectionSchema.methods.updateStrength = function(interactionType = 'view') {
  const strengthMap = {
    'view': 1,
    'like': 2,
    'comment': 3,
    'message': 5,
    'game_together': 10
  };
  
  this.strength = Math.min(100, this.strength + (strengthMap[interactionType] || 1));
  this.interactionCount += 1;
  this.lastInteraction = new Date();
  
  return this.save();
};

// Pre-save middleware to update mutual status
connectionSchema.pre('save', async function(next) {
  if (this.status === 'accepted' && this.connectionType === 'follow') {
    // Check if the other user also follows back
    const reverseConnection = await this.constructor.findOne({
      requester: this.recipient,
      recipient: this.requester,
      status: 'accepted',
      connectionType: 'follow'
    });
    
    if (reverseConnection) {
      this.isMutual = true;
      reverseConnection.isMutual = true;
      await reverseConnection.save();
    }
  }
  
  next();
});

module.exports = mongoose.model("Connection", connectionSchema);