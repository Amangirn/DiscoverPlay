const User = require('../models/User');
const { AUTH_COOKIE, getCookie, verifyToken } = require('../utils/auth');

async function protect(req, res, next) {
    try {
        const token = getCookie(req, AUTH_COOKIE);
        const payload = verifyToken(token);

        if (!payload) {
            return res.status(401).json({ success: false, message: 'Authentication required.' });
        }

        const user = await User.findById(payload.sub).select('-password').lean();
        if (!user) {
            return res.status(401).json({ success: false, message: 'User account no longer exists.' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(401).json({ success: false, message: 'Invalid authentication.' });
    }
}

async function optionalProtect(req, res, next) {
    try {
        const token = getCookie(req, AUTH_COOKIE);
        const payload = verifyToken(token);

        if (!payload) {
            return next();
        }

        const user = await User.findById(payload.sub).select('-password').lean();
        if (user) req.user = user;
        next();
    } catch (error) {
        // Public endpoints should still work when a browser has an expired cookie.
        next();
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required.' });
    }
    next();
}

module.exports = { protect, optionalProtect, requireAdmin };
