const mongoose = require('mongoose');
const User = require('../models/User');
const Game = require('../models/Game');

const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, count: users.length, data: users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ success: false, message: 'Could not load users.' });
    }
};

const getUserStats = async (req, res) => {
    try {
        const [userCount, adminCount, gameCount, viewAgg, unreadMessages] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'admin' }),
            Game.countDocuments(),
            Game.aggregate([{ $group: { _id: null, totalViews: { $sum: '$viewCount' } } }]),
            mongoose.connection.collection('contactmessages').countDocuments({ status: 'unread' })
        ]);

        res.json({
            success: true,
            data: {
                users: userCount,
                admins: adminCount,
                games: gameCount,
                totalViews: viewAgg[0]?.totalViews || 0,
                unreadMessages
            }
        });
    } catch (error) {
        console.error('Get admin stats error:', error);
        res.status(500).json({ success: false, message: 'Could not load dashboard statistics.' });
    }
};

const validateGameId = (res, id) => {
    if (!mongoose.isValidObjectId(id)) {
        res.status(404).json({ success: false, message: 'Game not found.' });
        return false;
    }
    return true;
};

const ensureGameExists = async (id) => Boolean(await Game.exists({ _id: id }));

const updateLibrary = async (req, res, field) => {
    const { id } = req.params;
    if (!validateGameId(res, id)) return;

    if (!await ensureGameExists(id)) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    const user = await User.findById(req.user._id).select('favoriteGames wishlistGames').lean();
    const current = (user?.[field] || []).map(String);
    const index = current.indexOf(String(id));
    const adding = index === -1;

    const update = adding
        ? { $addToSet: { [field]: id } }
        : { $pull: { [field]: id } };

    const updated = await User.findByIdAndUpdate(
        req.user._id,
        update,
        { new: true }
    ).select('favoriteGames wishlistGames').lean();

    res.json({
        success: true,
        action: adding ? 'added' : 'removed',
        favoriteGames: updated.favoriteGames || [],
        wishlistGames: updated.wishlistGames || []
    });
};

const toggleFavorite = (req, res) => updateLibrary(req, res, 'favoriteGames');
const toggleWishlist = (req, res) => updateLibrary(req, res, 'wishlistGames');

const getLibrary = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('favoriteGames wishlistGames')
            .lean();

        const favoriteIds = user?.favoriteGames || [];
        const wishlistIds = user?.wishlistGames || [];

        const [favorites, wishlist] = await Promise.all([
            Game.find({ _id: { $in: favoriteIds } }).lean(),
            Game.find({ _id: { $in: wishlistIds } }).lean()
        ]);

        const order = ids => new Map(ids.map((id, index) => [String(id), index]));
        const favoriteOrder = order(favoriteIds);
        const wishlistOrder = order(wishlistIds);

        favorites.sort((a, b) => favoriteOrder.get(String(a._id)) - favoriteOrder.get(String(b._id)));
        wishlist.sort((a, b) => wishlistOrder.get(String(a._id)) - wishlistOrder.get(String(b._id)));

        res.json({
            success: true,
            data: {
                favorites,
                wishlist,
                favoriteIds,
                wishlistIds
            }
        });
    } catch (error) {
        console.error('Get library error:', error);
        res.status(500).json({ success: false, message: 'Could not load your games.' });
    }
};

module.exports = {
    getUsers,
    getUserStats,
    toggleFavorite,
    toggleWishlist,
    getLibrary
};
