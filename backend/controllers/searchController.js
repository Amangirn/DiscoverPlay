const Game = require('../models/Game');

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Search games
 * @route   GET /api/search?q=...
 * @access  Public
 */
const search = async (req, res) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const safeQuery = escapeRegex(q);
        const games = await Game.find({
            $or: [
                { title: { $regex: safeQuery, $options: 'i' } },
                { genre: { $regex: safeQuery, $options: 'i' } },
                { developer: { $regex: safeQuery, $options: 'i' } },
                { publisher: { $regex: safeQuery, $options: 'i' } }
            ]
        })
            .sort({ title: 1 })
            .limit(20)
            .lean();

        res.json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

module.exports = {
    search
};
