const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const gameRoutes = require("./routes/gameRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ratingRoutes = require("./routes/ratingRoutes");

const app = express();

// ✅ CORS Ayarı — sadece Vercel frontend'e izin ver
const allowedOrigins = ["https://ggdb.vercel.app"];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// ✅ JSON middleware
app.use(express.json());

// ✅ DEBUG: API route'ları yükleniyor
console.log("✅ Registering /api/games");
app.use("/api/games", gameRoutes);

console.log("✅ Registering /api/auth");
app.use("/api/auth", authRoutes);

console.log("✅ Registering /api/admin");
app.use("/api/admin", adminRoutes);

console.log("✅ Registering /api/ratings");
app.use("/api/ratings", ratingRoutes);

// ✅ CORS preflight desteği
app.options("*", cors());

// ✅ MongoDB bağlantısı
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Server başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
