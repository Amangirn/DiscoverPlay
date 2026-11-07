const mongoose = require('mongoose');
const Game = require('../models/Game');
const User = require('../models/User');

const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 500;

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePagination = query => {
    const requestedPage = Number.parseInt(query.page, 10);
    const requestedLimit = Number.parseInt(query.limit, 10);

    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE;

    return { page, limit, skip: (page - 1) * limit };
};

const sendServerError = (res, error) => {
    console.error('Games controller error:', error);
    return res.status(500).json({
        success: false,
        message: 'Server Error'
    });
};

/**
 * @desc    Get games with optional search, platform, sort and pagination
 * @route   GET /api/games
 * @access  Public
 */
const getGames = async (req, res) => {
    try {
        const { search, sort, platform } = req.query;
        const { page, limit, skip } = parsePagination(req.query);

        const query = {};

        if (platform) {
            query.platforms = platform;
        }

        if (search && search.trim()) {
            const term = search.trim();
            const safeTerm = escapeRegex(term);

            // Regex keeps partial searches working ("cyber" -> "Cyberpunk").
            query.$or = [
                { title: { $regex: safeTerm, $options: 'i' } },
                { genre: { $regex: safeTerm, $options: 'i' } },
                { developer: { $regex: safeTerm, $options: 'i' } },
                { publisher: { $regex: safeTerm, $options: 'i' } }
            ];
        }

        let sortOption = { createdAt: -1, _id: -1 };

        switch (sort) {
            case 'newest':
                sortOption = { releaseDate: -1, _id: -1 };
                break;
            case 'oldest':
                sortOption = { releaseDate: 1, _id: 1 };
                break;
            case 'az':
                sortOption = { title: 1, _id: 1 };
                break;
            case 'za':
                sortOption = { title: -1, _id: -1 };
                break;
        }

        const [games, total] = await Promise.all([
            Game.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean(),
            Game.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            count: games.length,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            data: games
        });
    } catch (error) {
        return sendServerError(res, error);
    }
};

/**
 * @desc    Get new releases
 * @route   GET /api/games/new-releases
 * @access  Public
 */
const getNewReleases = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), MAX_PAGE_SIZE);
        const now = new Date();
        const games = await Game.find({
            releaseDate: { $ne: null, $lte: now }
        })
            .sort({ releaseDate: -1, viewCount: -1, _id: -1 })
            .limit(limit)
            .lean();

        res.status(200).json({ success: true, count: games.length, data: games });
    } catch (error) {
        return sendServerError(res, error);
    }
};

/**
 * @desc    Get trending games
 * @route   GET /api/games/trending
 * @access  Public
 *
 * Current project has no view/rating/popularity model, so "trending"
 * is based on recently added games.
 */
const getTrendingGames = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), MAX_PAGE_SIZE);
        const now = new Date();

        const games = await Game.find({
            $or: [
                { releaseDate: { $lte: now } },
                { releaseDate: null }
            ]
        })
            .sort({ viewCount: -1, featuredWeight: -1, releaseDate: -1, createdAt: -1, _id: -1 })
            .limit(limit)
            .lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        return sendServerError(res, error);
    }
};

/**
 * @desc    Get recommended games
 * @route   GET /api/games/recommended
 * @access  Public
 *
 * There is no user-preference/rating system yet. We therefore use
 * release recency as the current deterministic recommendation signal.
 */
const getRecommendedGames = async (req, res) => {
    try {
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 8, 1), MAX_PAGE_SIZE);
        const now = new Date();
        const viewedIds = req.user?.recentlyViewed || [];

        let preferenceGenres = new Map();
        let preferencePlatforms = new Map();

        if (viewedIds.length) {
            const viewedGames = await Game.find({ _id: { $in: viewedIds } })
                .select('genre platforms')
                .lean();

            for (const game of viewedGames) {
                if (game.genre) {
                    for (const genre of game.genre.split(',').map(v => v.trim()).filter(Boolean)) {
                        preferenceGenres.set(genre, (preferenceGenres.get(genre) || 0) + 1);
                    }
                }
                for (const platform of game.platforms || []) {
                    preferencePlatforms.set(platform, (preferencePlatforms.get(platform) || 0) + 1);
                }
            }
        }

        const candidates = await Game.find({
            _id: viewedIds.length ? { $nin: viewedIds } : { $exists: true },
            $or: [
                { releaseDate: null },
                { releaseDate: { $lte: now } }
            ]
        })
            .sort({ viewCount: -1, releaseDate: -1, createdAt: -1, _id: -1 })
            .limit(Math.max(limit * 8, 60))
            .lean();

        const scored = candidates.map(game => {
            let score = 0;
            const genres = (game.genre || '').split(',').map(v => v.trim()).filter(Boolean);
            for (const genre of genres) score += (preferenceGenres.get(genre) || 0) * 6;
            for (const platform of game.platforms || []) score += (preferencePlatforms.get(platform) || 0) * 3;
            score += Math.min(game.viewCount || 0, 50) * 0.35;
            if (game.releaseDate) {
                const ageDays = Math.max(0, (now - new Date(game.releaseDate)) / 86400000);
                score += Math.max(0, 20 - ageDays / 30);
            }
            score += (game.featuredWeight || 0) * 0.2;
            return { game, score };
        }).sort((a, b) => b.score - a.score);

        const result = scored.slice(0, limit).map(item => item.game);
        res.status(200).json({
            success: true,
            count: result.length,
            personalized: viewedIds.length > 0 && (preferenceGenres.size > 0 || preferencePlatforms.size > 0),
            data: result
        });
    } catch (error) {
        return sendServerError(res, error);
    }
};

/**
 * @desc    Get featured game
 * @route   GET /api/games/featured
 * @access  Public
 */

const getFeaturedGame = async (req, res) => {
    try {
        const now = new Date();

        // Get all eligible game IDs in a consistent order.
        const games = await Game.find({
            $or: [
                { releaseDate: null },
                { releaseDate: { $lte: now } }
            ]
        })
            .select('_id')
            .sort({ _id: 1 })
            .lean();

        if (!games.length) {
            return res.status(200).json({
                success: true,
                data: null
            });
        }

        // Select a different game each day.
        const dayNumber = Math.floor(
            Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
            ) / 86400000
        );

        const selectedIndex = dayNumber % games.length;
        const selectedGame = await Game.findById(
            games[selectedIndex]._id
        ).lean();

        res.status(200).json({
            success: true,
            data: selectedGame
        });

    } catch (error) {
        return sendServerError(res, error);
    }
};


/**
 * @desc    Get similar games
 * @route   GET /api/games/:id/similar
 * @access  Public
 */
const getSimilarGames = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        const game = await Game.findById(req.params.id).lean();
        if (!game) return res.status(404).json({ success: false, message: 'Game not found' });

        const genres = (game.genre || '').split(',').map(v => v.trim()).filter(Boolean);
        const query = { _id: { $ne: game._id } };
        if (genres.length) {
            query.genre = { $in: genres.map(g => new RegExp(escapeRegex(g), 'i')) };
        }
        if (game.platforms?.length) query.platforms = { $in: game.platforms };

        const similarGames = await Game.find(query)
            .sort({ viewCount: -1, releaseDate: -1, createdAt: -1 })
            .limit(4)
            .lean();

        res.status(200).json({ success: true, count: similarGames.length, data: similarGames });
    } catch (error) {
        return sendServerError(res, error);
    }
};

/**
 * @desc    Get one game by ID
 * @route   GET /api/games/:id
 * @access  Public
 */
const getGameById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        const game = await Game.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewCount: 1 } },
            { new: true }
        ).lean();

        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        if (req.user?._id) {
            await User.findByIdAndUpdate(req.user._id, {
                $pull: { recentlyViewed: game._id }
            });
            await User.findByIdAndUpdate(req.user._id, {
                $push: { recentlyViewed: { $each: [game._id], $position: 0, $slice: 20 } }
            });
        }

        res.status(200).json({ success: true, data: game });
    } catch (error) {
        return sendServerError(res, error);
    }
};

/**
 * @desc    Create a new game
 * @route   POST /api/games
 * @access  Private/Admin
 */
const GAME_WRITE_FIELDS = [
    'title',
    'description',
    'logoImage',
    'coverImage',
    'screenshots',
    'genre',
    'platforms',
    'developer',
    'publisher',
    'releaseDate',
    'featuredWeight',
    'storeLinks'
];

const pickGameWriteFields = body => Object.fromEntries(
    GAME_WRITE_FIELDS
        .filter(field => Object.prototype.hasOwnProperty.call(body || {}, field))
        .map(field => [field, body[field]])
);

const validateGameUrls = data => {
    const urls = [];
    if (data.logoImage) urls.push(['logoImage', data.logoImage]);
    if (data.coverImage) urls.push(['coverImage', data.coverImage]);
    for (const [index, url] of (data.screenshots || []).entries()) urls.push([`screenshots[${index}]`, url]);
    for (const [index, item] of (data.storeLinks || []).entries()) {
        if (item && item.url) urls.push([`storeLinks[${index}].url`, item.url]);
    }
    for (const [label, value] of urls) {
        try {
            const parsed = new URL(String(value).trim());
            if (!['http:', 'https:'].includes(parsed.protocol)) return `${label} must be an HTTP or HTTPS URL.`;
        } catch {
            return `${label} must be a valid HTTP or HTTPS URL.`;
        }
    }
    return null;
};

const createGame = async (req, res) => {
    try {
        const data = pickGameWriteFields(req.body);
        const { title, description, genre } = data;

        if (!title || !description || !genre) {
            return res.status(400).json({
                success: false,
                message: 'Please provide title, description, and genre'
            });
        }

        const urlError = validateGameUrls(data);
        if (urlError) return res.status(400).json({ success: false, message: urlError });

        const newGame = await Game.create(data);

        res.status(201).json({
            success: true,
            data: newGame
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        return sendServerError(res, error);
    }
};

/**
 * @desc    Update an existing game
 * @route   PUT /api/games/:id
 * @access  Private/Admin
 */
const updateGame = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        const data = pickGameWriteFields(req.body);
        const urlError = validateGameUrls(data);
        if (urlError) return res.status(400).json({ success: false, message: urlError });

        const game = await Game.findByIdAndUpdate(
            req.params.id,
            { $set: data },
            {
                new: true,
                runValidators: true,
                context: 'query'
            }
        ).lean();

        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        res.status(200).json({ success: true, data: game });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        return sendServerError(res, error);
    }
};

/**
 * @desc    Delete a game
 * @route   DELETE /api/games/:id
 * @access  Private/Admin
 */
const deleteGame = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        const game = await Game.findByIdAndDelete(req.params.id);

        if (!game) {
            return res.status(404).json({ success: false, message: 'Game not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Game deleted successfully'
        });
    } catch (error) {
        return sendServerError(res, error);
    }
};

module.exports = {
    getGames,
    getGameById,
    createGame,
    updateGame,
    deleteGame,
    getNewReleases,
    getTrendingGames,
    getRecommendedGames,
    getFeaturedGame,
    getSimilarGames
};
