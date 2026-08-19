const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    category: { type: String, enum: ['suggestion', 'business', 'other'], default: 'suggestion' },
    message: { type: String, required: true, trim: true, minlength: 10, maxlength: 3000 },
    status: { type: String, enum: ['unread', 'read'], default: 'unread' }
}, { timestamps: true });

contactMessageSchema.index({ createdAt: -1, status: 1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
