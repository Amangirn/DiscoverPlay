const ContactMessage = require('../models/ContactMessage');

const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function createMessage(req, res) {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const category = ['suggestion', 'business', 'other'].includes(req.body.category) ? req.body.category : 'suggestion';
        const message = String(req.body.message || '').trim();

        if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        if (message.length < 10) return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });
        if (message.length > 3000) return res.status(400).json({ success: false, message: 'Message is too long.' });

        const saved = await ContactMessage.create({ email, category, message });
        return res.status(201).json({ success: true, message: 'Thanks. Your message has been sent.', data: { id: saved._id } });
    } catch (error) {
        console.error('Create contact message error:', error);
        return res.status(500).json({ success: false, message: 'Could not send your message right now.' });
    }
}

async function listMessages(req, res) {
    try {
        const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
        return res.json({ success: true, count: messages.length, data: messages });
    } catch (error) {
        console.error('List contact messages error:', error);
        return res.status(500).json({ success: false, message: 'Could not load contact messages.' });
    }
}

async function updateStatus(req, res) {
    try {
        const status = req.body.status === 'read' ? 'read' : 'unread';
        const message = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
        if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });
        return res.json({ success: true, data: message });
    } catch (error) {
        console.error('Update contact message error:', error);
        return res.status(500).json({ success: false, message: 'Could not update message.' });
    }
}

async function deleteMessage(req, res) {
    try {
        const deleted = await ContactMessage.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Message not found.' });
        return res.json({ success: true, message: 'Message deleted.' });
    } catch (error) {
        console.error('Delete contact message error:', error);
        return res.status(500).json({ success: false, message: 'Could not delete message.' });
    }
}

module.exports = { createMessage, listMessages, updateStatus, deleteMessage };
