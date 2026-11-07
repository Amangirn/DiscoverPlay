const mongoose = require('mongoose');

const supportContributionSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    paymentId: {
        type: String,
        unique: true,
        sparse: true
    },
    amount: {
        type: Number,
        required: true,
        default: 9900
    },
    currency: {
        type: String,
        required: true,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'captured'],
        default: 'created',
        index: true
    },
    paidAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('SupportContribution', supportContributionSchema);
