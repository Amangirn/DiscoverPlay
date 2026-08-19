const express = require('express');
const router = express.Router();
const { protect, optionalProtect, requireAdmin } = require('../middleware/authMiddleware');

const { 
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
} = require('../controllers/gamesController');

// Map standard REST routes to the controller functions
router.route('/')
    .get(getGames)
    .post(protect, requireAdmin, createGame);

// Discovery endpoints (Must be before /:id)
router.get('/new-releases', getNewReleases);
router.get('/trending', getTrendingGames);
router.get('/recommended', getRecommendedGames);
router.get('/featured', getFeaturedGame);
router.get('/:id/similar', getSimilarGames);

router.route('/:id')
    .get(optionalProtect, getGameById)
    .put(protect, requireAdmin, updateGame)
    .delete(protect, requireAdmin, deleteGame);

module.exports = router;
