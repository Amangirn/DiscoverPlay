const express = require('express');
const router = express.Router();
const { createMessage, listMessages, updateStatus, deleteMessage } = require('../controllers/contactController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

router.post('/', createMessage);
router.get('/', protect, requireAdmin, listMessages);
router.put('/:id/status', protect, requireAdmin, updateStatus);
router.delete('/:id', protect, requireAdmin, deleteMessage);

module.exports = router;
