// 📁 routes/igdbRoutes.js
const express = require("express");
const axios = require("axios");
const router = express.Router();

// IGDB Token yönetimi
let igdbToken = null;
let tokenExpiry = null;

// Token alma fonksiyonu
const getIGDBToken = async () => {
    // Token hala geçerliyse mevcut token'ı döndür
    if (igdbToken && tokenExpiry && Date.now() < tokenExpiry) {
        return igdbToken;
    }

    try {
        console.log("🔄 IGDB token yenileniyor...");
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                grant_type: 'client_credentials'
            }
        });

        igdbToken = response.data.access_token;
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 dakika önce expire et

        console.log("✅ IGDB token yenilendi");
        return igdbToken;
    } catch (error) {
        console.error("❌ IGDB token alma hatası:", error.response?.data || error.message);
        throw new Error("IGDB token alınamadı");
    }
};

// IGDB oyun arama endpoint'i
router.get("/search", async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: "En az 2 karakter arama yapmalısınız" });
        }

        const token = await getIGDBToken();

        // IGDB search query
        const igdbQuery = `search "${query}"; fields id,name,cover.url,first_release_date,rating,summary,genres.name,platforms.name,involved_companies.company.name; limit 20;`;

        const response = await axios.post('https://api.igdb.com/v4/games', igdbQuery, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain'
            }
        });

        console.log(`✅ IGDB arama: "${query}" - ${response.data.length} sonuç`);
        res.json(response.data);

    } catch (error) {
        console.error("❌ IGDB arama hatası:", error.response?.data || error.message);
        res.status(500).json({
            error: "IGDB arama başarısız",
            details: error.response?.data || error.message
        });
    }
});

// IGDB oyun detayları endpoint'i
router.get("/game/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Geçersiz oyun ID" });
        }

        const token = await getIGDBToken();

        // Detaylı IGDB query - tüm gerekli bilgileri çekiyor
        const igdbQuery = `fields id,name,summary,storyline,first_release_date,rating,rating_count,cover.url,screenshots.url,artworks.url,videos.video_id,videos.name,videos.checksum,genres.name,platforms.name,themes.name,keywords.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,game_engines.name,franchises.name,collection.name,age_ratings.rating,age_ratings.category,websites.url,websites.category,similar_games.name,similar_games.cover.url,player_perspectives.name,game_modes.name,release_dates.date,release_dates.platform.name; where id = ${id};`;

        const response = await axios.post('https://api.igdb.com/v4/games', igdbQuery, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain'
            }
        });

        if (!response.data || response.data.length === 0) {
            return res.status(404).json({ error: "Oyun bulunamadı" });
        }

        console.log(`✅ IGDB oyun detayları alındı: ${response.data[0].name}`);
        res.json(response.data[0]);

    } catch (error) {
        console.error("❌ IGDB oyun detayları hatası:", error.response?.data || error.message);
        res.status(500).json({
            error: "IGDB oyun detayları alınamadı",
            details: error.response?.data || error.message
        });
    }
});

// Health check endpoint
router.get("/health", async (req, res) => {
    try {
        const token = await getIGDBToken();
        res.json({
            status: "OK",
            hasToken: !!token,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: "ERROR",
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;