const express = require("express");
const { getUserActivity } = require("../controllers/userActivityController");
const router = express.Router();

// GET /api/user-activity/:userId
router.get("/:userId", getUserActivity);

module.exports = router;
