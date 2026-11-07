const express = require('express');
const router = express.Router();

const {
    createSupportOrder,
    verifySupportPayment
} = require('../controllers/paymentController');

router.post('/create-order', createSupportOrder);
router.post('/verify', verifySupportPayment);

module.exports = router;
