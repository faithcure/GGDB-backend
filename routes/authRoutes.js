const express = require("express");
const router = express.Router();
const { register, login, getMe, logout } = require("../controllers/authController");


router.get("/me", getMe);
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
module.exports = router;
