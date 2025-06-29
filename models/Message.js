const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  // Conversation participants
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }],
  
  // Message sender
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Message content
  content: {
    text: {
      type: String,
      required: true,
      maxlength: 2000
    },
    
    // Message type
    type: {
      type: String,
      enum: ["text", "image", "game_share", "profile_share", "system"],
      default: "text"
    },
    
    // Attachments
    attachments: [{
      type: {
        type: String,
        enum: ["image", "game", "profile", "link"]
      },
      url: String,
      metadata: {
        title: String,
        description: String,
        thumbnail: String
      }
    }],
    
    // Game-specific content
    gameReference: {
      gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Games"
      },
      gameTitle: String,
      gameImage: String,
      context: String // "recommendation", "review_share", "achievement"
    }
  },
  
  // Message status
  status: {
    type: String,
    enum: ["sent", "delivered", "read", "deleted"],
    default: "sent"
  },
  
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message metadata
  metadata: {
    edited: {
      type: Boolean,
      default: false
    },
    editedAt: Date,
    
    // Reply to another message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message"
    },
    
    // Message reactions
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      emoji: String,
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Delivery tracking
    deliveredTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      deliveredAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Conversation metadata
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  
  // Message thread
  threadId: String,
  
  // Privacy and moderation
  flagged: {
    type: Boolean,
    default: false
  },
  
  flaggedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reason: String,
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ participants: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ "content.type": 1 });
messageSchema.index({ status: 1 });

// Virtual for conversation display
messageSchema.virtual('isSystemMessage').get(function() {
  return this.content.type === 'system';
});

// Virtual for message preview (for conversation list)
messageSchema.virtual('preview').get(function() {
  if (this.content.type === 'text') {
    return this.content.text.length > 50 
      ? this.content.text.substring(0, 50) + '...'
      : this.content.text;
  }
  
  const typeMap = {
    'image': '📷 Image',
    'game_share': '🎮 Shared a game',
    'profile_share': '👤 Shared a profile',
    'system': '⚙️ System message'
  };
  
  return typeMap[this.content.type] || 'Message';
});

// Static method to create conversation ID
messageSchema.statics.generateConversationId = function(participants) {
  // Sort participant IDs to ensure consistent conversation IDs
  const sortedIds = participants.map(p => p.toString()).sort();
  return sortedIds.join('_');
};

// Static method to get conversation messages
messageSchema.statics.getConversationMessages = function(conversationId, page = 1, limit = 50) {
  return this.find({ conversationId })
    .populate('sender', 'username avatar')
    .populate('content.gameReference.gameId', 'title coverImage')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .lean();
};

// Static method to get user conversations
messageSchema.statics.getUserConversations = function(userId, page = 1, limit = 20) {
  return this.aggregate([
    {
      $match: {
        participants: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$sender', new mongoose.Types.ObjectId(userId)] },
                  { $not: { $in: [new mongoose.Types.ObjectId(userId), '$readBy.user'] } }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.participants',
        foreignField: '_id',
        as: 'participantUsers'
      }
    },
    {
      $addFields: {
        otherParticipants: {
          $filter: {
            input: '$participantUsers',
            cond: { $ne: ['$$this._id', new mongoose.Types.ObjectId(userId)] }
          }
        }
      }
    },
    {
      $sort: { 'lastMessage.createdAt': -1 }
    },
    {
      $skip: (page - 1) * limit
    },
    {
      $limit: limit
    }
  ]);
};

// Instance method to mark as read
messageSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(read => read.user.toString() === userId.toString());
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Instance method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.metadata.reactions = this.metadata.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.metadata.reactions.push({
    user: userId,
    emoji: emoji,
    addedAt: new Date()
  });
  
  return this.save();
};

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Generate conversation ID if not exists
  if (!this.conversationId && this.participants.length > 0) {
    this.conversationId = this.constructor.generateConversationId(this.participants);
  }
  
  // Auto-mark as delivered to all participants except sender
  if (this.isNew) {
    this.metadata.deliveredTo = this.participants
      .filter(p => p.toString() !== this.sender.toString())
      .map(user => ({
        user: user,
        deliveredAt: new Date()
      }));
  }
  
  next();
});

module.exports = mongoose.model("Message", messageSchema);