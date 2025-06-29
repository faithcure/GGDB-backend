// 📁 server.js - Enhanced with security middleware
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
require("dotenv").config();

// Security middleware
const { 
  apiLimiter, 
  authLimiter, 
  adminLimiter, 
  speedLimiter 
} = require("./middleware/rateLimitMiddleware");

// Mevcut route'larınız
const userActivityRoutes = require("./routes/userActivityRoutes");
const gameRoutes = require("./routes/gameRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");
const igdbRoutes = require("./routes/igdbRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();

// 🛡️ Trust proxy for rate limiting
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy in production
} else {
  app.set('trust proxy', false); // Disable trust proxy in development for security
}

// 🛡️ Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.igdb.com", "https://images.igdb.com"]
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Apply rate limiting (only in production)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', apiLimiter);
  app.use('/api/', speedLimiter);
  console.log('📊 Rate limiting enabled for production');
} else {
  console.log('🔧 Rate limiting disabled for development');
}

// ✅ CORS — enhanced security configuration
const allowedOrigins = [
  "https://ggdb.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json());

// ✅ Routes with conditional rate limiting
app.use("/api/games", gameRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use("/api/auth", authLimiter, authRoutes);
  app.use("/api/admin", adminLimiter, adminRoutes);
} else {
  app.use("/api/auth", authRoutes);
  app.use("/api/admin", adminRoutes);
}

app.use("/api/ratings", ratingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/user-activity", userActivityRoutes);
app.use("/api/users", userRoutes);

// 🆕 IGDB route'unu ekle
app.use("/api/igdb", igdbRoutes);

// 🔗 Social networking routes
app.use("/api/connections", connectionRoutes);
app.use("/api/messages", messageRoutes);

// 🏥 Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Enhanced MongoDB Connection with error handling
mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      socketTimeoutMS: 0, // Disable socket timeout in development
      connectTimeoutMS: 10000, // Connection timeout
      heartbeatFrequencyMS: 1000, // How often to send heartbeat
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Keep connection alive in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        if (mongoose.connection.readyState === 1) {
          mongoose.connection.db.admin().ping();
        }
      }, 30000); // Ping every 30 seconds
    }

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    // Graceful exit on connection failure
    process.exit(1);
  }
};

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 API Rate Limit: 100 requests per 15 minutes`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️ Received ${signal}. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
    // Close database connection
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close server after 30 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});