const crypto = require('crypto');
const SupportContribution = require('../models/SupportContribution');

const SUPPORT_AMOUNT = 9900; // INR 99.00, fixed server-side.
const SUPPORT_CURRENCY = 'INR';

function getRazorpayCredentials() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        const error = new Error('Razorpay is not configured on the server yet.');
        error.statusCode = 503;
        throw error;
    }

    return { keyId, keySecret };
}

function razorpayAuthHeader(keyId, keySecret) {
    return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

async function razorpayRequest(url, { keyId, keySecret }, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            Authorization: razorpayAuthHeader(keyId, keySecret),
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            data?.error?.description || 'Razorpay could not process the request.'
        );
        error.statusCode = response.status >= 500 ? 502 : 400;
        throw error;
    }

    return data;
}

// POST /api/payments/create-order
// The amount is intentionally fixed on the server. Never accept a client-supplied amount.
async function createSupportOrder(req, res, next) {
    try {
        const credentials = getRazorpayCredentials();
        const receipt = `dp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        const order = await razorpayRequest(
            'https://api.razorpay.com/v1/orders',
            credentials,
            {
                method: 'POST',
                body: JSON.stringify({
                    amount: SUPPORT_AMOUNT,
                    currency: SUPPORT_CURRENCY,
                    receipt,
                    notes: {
                        purpose: 'DiscoverPlay developer support'
                    }
                })
            }
        );

        await SupportContribution.create({
            orderId: order.id,
            amount: SUPPORT_AMOUNT,
            currency: SUPPORT_CURRENCY,
            status: 'created'
        });

        res.status(201).json({
            success: true,
            keyId: credentials.keyId,
            orderId: order.id,
            amount: SUPPORT_AMOUNT,
            currency: SUPPORT_CURRENCY,
            name: 'DiscoverPlay',
            description: 'One-time developer support'
        });
    } catch (error) {
        next(error);
    }
}

// POST /api/payments/verify
async function verifySupportPayment(req, res, next) {
    try {
        const {
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            razorpay_signature: signature
        } = req.body || {};

        if (
            typeof orderId !== 'string' ||
            typeof paymentId !== 'string' ||
            typeof signature !== 'string' ||
            !orderId.startsWith('order_') ||
            !paymentId.startsWith('pay_') ||
            !/^[a-f0-9]{64}$/i.test(signature)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment verification details.'
            });
        }

        const contribution = await SupportContribution.findOne({ orderId });
        if (!contribution) {
            return res.status(404).json({
                success: false,
                message: 'This payment order was not found.'
            });
        }

        if (contribution.status === 'captured') {
            if (contribution.paymentId === paymentId) {
                return res.json({
                    success: true,
                    message: 'Thank you for supporting DiscoverPlay!',
                    paymentId
                });
            }

            return res.status(409).json({
                success: false,
                message: 'This support order has already been paid.'
            });
        }

        const { keyId, keySecret } = getRazorpayCredentials();
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${contribution.orderId}|${paymentId}`)
            .digest('hex');

        const received = Buffer.from(signature, 'hex');
        const expected = Buffer.from(expectedSignature, 'hex');

        if (
            received.length !== expected.length ||
            !crypto.timingSafeEqual(received, expected)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Payment signature verification failed.'
            });
        }

        // Verify the payment with Razorpay itself, not only the browser callback.
        const payment = await razorpayRequest(
            `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
            { keyId, keySecret },
            { method: 'GET' }
        );

        if (
            payment.order_id !== contribution.orderId ||
            payment.amount !== SUPPORT_AMOUNT ||
            payment.currency !== SUPPORT_CURRENCY
        ) {
            return res.status(400).json({
                success: false,
                message: 'Payment details do not match this support order.'
            });
        }

        if (payment.status !== 'captured') {
            return res.status(409).json({
                success: false,
                message: payment.status === 'authorized'
                    ? 'Your payment is authorised but not captured yet. Please check again shortly.'
                    : 'The payment has not been captured.'
            });
        }

        contribution.paymentId = paymentId;
        contribution.status = 'captured';
        contribution.paidAt = new Date();
        await contribution.save();

        return res.json({
            success: true,
            message: 'Thank you for supporting DiscoverPlay!',
            paymentId
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createSupportOrder,
    verifySupportPayment
};
