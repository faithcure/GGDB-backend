const jwt = require("jsonwebtoken");

// Genel auth kontrolü (her kullanıcı için)
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Sadece admin'lere izin veren middleware
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "Admin") {
    return res.status(404).json({ message: "Not found" }); // Erişimi olmayanlara 404
  }
  next();
};

module.exports = {
  authMiddleware,
  adminOnly,
};
