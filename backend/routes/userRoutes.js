const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUserStats,
    toggleFavorite,
    toggleWishlist,
    getLibrary
} = require('../controllers/userController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.get('/library', protect, getLibrary);
router.post('/favorites/:id/toggle', protect, toggleFavorite);
router.post('/wishlist/:id/toggle', protect, toggleWishlist);

router.get('/stats', protect, requireAdmin, getUserStats);
router.get('/', protect, requireAdmin, getUsers);

module.exports = router;
