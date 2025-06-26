// 📁 routes/igdbRoutes.js - FIXED VERSION with Language Support
const express = require("express");
const axios = require("axios");
const router = express.Router();

// IGDB Token yönetimi
let igdbToken = null;
let tokenExpiry = null;

// Token alma fonksiyonu
const getIGDBToken = async () => {
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
        tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000;

        console.log("✅ IGDB token yenilendi");
        return igdbToken;
    } catch (error) {
        console.error("❌ IGDB token alma hatası:", error.response?.data || error.message);
        throw new Error("IGDB token alınamadı");
    }
};

// 🆕 FIXED: IGDB oyun arama endpoint'i with language support
router.get("/search", async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ error: "En az 2 karakter arama yapmalısınız" });
        }

        const token = await getIGDBToken();

        // 🔧 FIXED: Language support eklendi
        const igdbQuery = `search "${query}"; fields id,name,cover.url,first_release_date,rating,summary,genres.name,platforms.name,involved_companies.company.name,language_supports.language.name,language_supports.language_support_type.name; limit 20;`;

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

// 🆕 FIXED: IGDB oyun detayları endpoint'i with comprehensive language support
router.get("/game/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Geçersiz oyun ID" });
        }

        const token = await getIGDBToken();

        // 🔧 FIXED: Language support field'ları eklendi
        const igdbQuery = `fields id,name,summary,storyline,first_release_date,rating,rating_count,cover.url,screenshots.url,artworks.url,videos.video_id,videos.name,videos.checksum,genres.name,platforms.name,themes.name,keywords.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,game_engines.name,franchises.name,collection.name,age_ratings.rating,age_ratings.category,websites.url,websites.category,similar_games.name,similar_games.cover.url,player_perspectives.name,game_modes.name,release_dates.date,release_dates.platform.name,language_supports.language.name,language_supports.language.native_name,language_supports.language.locale,language_supports.language_support_type.name; where id = ${id};`;

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

        const gameData = response.data[0];

        // 🆕 Language support debug logging
        console.log(`✅ IGDB oyun detayları alındı: ${gameData.name}`);
        if (gameData.language_supports && gameData.language_supports.length > 0) {
            console.log(`🌍 ${gameData.language_supports.length} dil desteği bulundu:`,
                gameData.language_supports.map(ls => `${ls.language?.name} (${ls.language_support_type?.name})`));
        } else {
            console.log(`⚠️  ${gameData.name} için IGDB'de dil desteği verisi bulunamadı`);
        }

        res.json(gameData);

    } catch (error) {
        console.error("❌ IGDB oyun detayları hatası:", error.response?.data || error.message);
        res.status(500).json({
            error: "IGDB oyun detayları alınamadı",
            details: error.response?.data || error.message
        });
    }
});

// 🆕 NEW: Dedicated language support endpoint
router.get("/game/:id/languages", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Geçersiz oyun ID" });
        }

        const token = await getIGDBToken();

        // Sadece dil desteği için özel query
        const igdbQuery = `fields language_supports.language.name,language_supports.language.native_name,language_supports.language.locale,language_supports.language_support_type.name; where id = ${id};`;

        const response = await axios.post('https://api.igdb.com/v4/games', igdbQuery, {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'text/plain'
            }
        });

        if (!response.data || response.data.length === 0) {
            return res.status(404).json({
                error: "Oyun bulunamadı",
                hasLanguageSupport: false
            });
        }

        const gameData = response.data[0];

        if (!gameData.language_supports || gameData.language_supports.length === 0) {
            return res.json({
                hasLanguageSupport: false,
                message: "Bu oyun için IGDB'de dil desteği verisi bulunmuyor",
                languages: {
                    audio: [],
                    subtitles: [],
                    interface: []
                }
            });
        }

        // Language support processing
        const processedLanguages = {
            audio: [],
            subtitles: [],
            interface: []
        };

        gameData.language_supports.forEach(support => {
            const languageName = support.language?.name || 'Bilinmeyen Dil';
            const supportType = support.language_support_type?.name || 'Unknown';

            // IGDB language support types mapping
            switch (supportType.toLowerCase()) {
                case 'audio':
                case 'voice':
                case 'spoken':
                    if (!processedLanguages.audio.includes(languageName)) {
                        processedLanguages.audio.push(languageName);
                    }
                    break;
                case 'subtitles':
                case 'text':
                    if (!processedLanguages.subtitles.includes(languageName)) {
                        processedLanguages.subtitles.push(languageName);
                    }
                    break;
                case 'interface':
                case 'menu':
                case 'ui':
                    if (!processedLanguages.interface.includes(languageName)) {
                        processedLanguages.interface.push(languageName);
                    }
                    break;
                default:
                    // Bilinmeyen tip için interface'e ekle
                    if (!processedLanguages.interface.includes(languageName)) {
                        processedLanguages.interface.push(languageName);
                    }
            }
        });

        console.log(`🌍 ${gameData.language_supports.length} dil desteği işlendi`);

        res.json({
            hasLanguageSupport: true,
            languages: processedLanguages,
            rawLanguageSupports: gameData.language_supports // Debug için
        });

    } catch (error) {
        console.error("❌ IGDB dil desteği hatası:", error.response?.data || error.message);
        res.status(500).json({
            error: "IGDB dil desteği alınamadı",
            hasLanguageSupport: false,
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