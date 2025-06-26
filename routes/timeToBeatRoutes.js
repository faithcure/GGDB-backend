// routes/timeToBeatRoutes.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// HowLongToBeat API endpoint - Ana kaynak (ücretsiz)
router.get('/hltb/:gameTitle', async (req, res) => {
    try {
        const { gameTitle } = req.params;

        // HowLongToBeat unofficial API
        const response = await axios.post('https://howlongtobeat.com/api/search', {
            searchType: "games",
            searchTerms: [gameTitle],
            searchPage: 1,
            size: 20,
            searchOptions: {
                games: {
                    userId: 0,
                    platform: "",
                    sortCategory: "popular",
                    rangeCategory: "main",
                    rangeTime: {
                        min: null,
                        max: null
                    },
                    gameplay: {
                        perspective: "",
                        flow: "",
                        genre: ""
                    },
                    modifier: ""
                },
                users: {
                    sortCategory: "postcount"
                },
                filter: "",
                sort: 0,
                randomizer: 0
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.data && response.data.data && response.data.data.length > 0) {
            const game = response.data.data[0];

            res.json({
                gameUrl: `https://howlongtobeat.com/game/${game.id}`,
                gameplayMain: game.comp_main || null,
                gameplayMainExtra: game.comp_plus || null,
                gameplayCompletionist: game.comp_100 || null,
                count: game.count_comp || 0,
                title: game.game_name,
                similarity: game.similarity || 0
            });
        } else {
            res.status(404).json({ error: 'Game not found on HowLongToBeat' });
        }
    } catch (error) {
        console.error('HowLongToBeat API error:', error);
        res.status(500).json({ error: 'Failed to fetch from HowLongToBeat' });
    }
});

// OpenCritic API endpoint - Destekleyici kaynak (ücretsiz)
router.get('/opencritic/:gameTitle', async (req, res) => {
    try {
        const { gameTitle } = req.params;

        // OpenCritic search API
        const searchResponse = await axios.get(`https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(gameTitle)}`, {
            headers: {
                'User-Agent': 'GGDB/1.0'
            }
        });

        if (searchResponse.data && searchResponse.data.length > 0) {
            const gameId = searchResponse.data[0].id;

            // Get detailed game info
            const gameResponse = await axios.get(`https://api.opencritic.com/api/game/${gameId}`, {
                headers: {
                    'User-Agent': 'GGDB/1.0'
                }
            });

            const game = gameResponse.data;

            res.json({
                url: `https://opencritic.com/game/${gameId}`,
                averagePlayTime: game.averagePlayTime || null,
                reviewCount: game.numReviews || 0,
                topCriticScore: game.topCriticScore || null,
                title: game.name
            });
        } else {
            res.status(404).json({ error: 'Game not found on OpenCritic' });
        }
    } catch (error) {
        console.error('OpenCritic API error:', error);
        res.status(500).json({ error: 'Failed to fetch from OpenCritic' });
    }
});

// RAWG API endpoint - Yedek kaynak (ücretsiz)
router.get('/rawg/:gameTitle', async (req, res) => {
    try {
        const { gameTitle } = req.params;
        const RAWG_API_KEY = process.env.RAWG_API_KEY;

        if (!RAWG_API_KEY) {
            return res.status(500).json({ error: 'RAWG API key not configured' });
        }

        const response = await axios.get(`https://api.rawg.io/api/games`, {
            params: {
                key: RAWG_API_KEY,
                search: gameTitle,
                page_size: 5
            }
        });

        if (response.data && response.data.results && response.data.results.length > 0) {
            const game = response.data.results[0];

            res.json({
                url: `https://rawg.io/games/${game.slug}`,
                title: game.name,
                playtime: game.playtime || null, // RAWG sometimes has basic playtime
                metacriticScore: game.metacritic || null,
                rating: game.rating || null,
                platforms: game.platforms?.map(p => p.platform.name) || []
            });
        } else {
            res.status(404).json({ error: 'Game not found on RAWG' });
        }
    } catch (error) {
        console.error('RAWG API error:', error);
        res.status(500).json({ error: 'Failed to fetch from RAWG' });
    }
});

// Aggregate endpoint - gets data from free sources only
router.get('/aggregate/:gameTitle', async (req, res) => {
    try {
        const { gameTitle } = req.params;

        // Fetch from free sources only in parallel
        const [hltbResult, openCriticResult, rawgResult] = await Promise.allSettled([
            axios.get(`${req.protocol}://${req.get('host')}/api/timetobeat/hltb/${encodeURIComponent(gameTitle)}`),
            axios.get(`${req.protocol}://${req.get('host')}/api/timetobeat/opencritic/${encodeURIComponent(gameTitle)}`),
            axios.get(`${req.protocol}://${req.get('host')}/api/timetobeat/rawg/${encodeURIComponent(gameTitle)}`)
        ]);

        const aggregatedData = {
            sources: [],
            averages: {
                main: null,
                mainExtra: null,
                completionist: null
            }
        };

        // Process results
        if (hltbResult.status === 'fulfilled') {
            aggregatedData.sources.push({
                name: 'HowLongToBeat',
                data: hltbResult.value.data,
                reliability: 'high'
            });
        }

        if (openCriticResult.status === 'fulfilled') {
            aggregatedData.sources.push({
                name: 'OpenCritic',
                data: openCriticResult.value.data,
                reliability: 'medium'
            });
        }

        if (rawgResult.status === 'fulfilled') {
            aggregatedData.sources.push({
                name: 'RAWG',
                data: rawgResult.value.data,
                reliability: 'low'
            });
        }

        res.json(aggregatedData);
    } catch (error) {
        console.error('Aggregate playtime error:', error);
        res.status(500).json({ error: 'Failed to aggregate playtime data' });
    }
});

module.exports = router;