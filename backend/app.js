const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const gameRoutes = require('./routes/gameRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');

const app = express();

// Baseline security headers. These are safe for the current same-origin app and reduce
// common browser-side attacks without changing application behavior.
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Keep request bodies bounded. This prevents accidentally accepting huge payloads.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// CORS can be restricted later with FRONTEND_ORIGIN.
// For the current local project, '*' keeps the existing frontend behavior.
const corsOrigin = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({
    origin: (origin, callback) => {
        // Allow browser requests from localhost and file:// during local development.
        if (!origin || origin === 'null' || origin === corsOrigin || /^https?:\/\/(localhost|127\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS origin not allowed'));
    },
    credentials: true
}));

app.use('/images', express.static(path.join(__dirname, '../images')));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'DiscoverPlay API is running'
    });
});

// Lightweight health endpoint for checking API + MongoDB connection state.
app.get('/api/health', (req, res) => {
    const mongoose = require('mongoose');
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];

    const state = mongoose.connection.readyState;
    const healthy = state === 1;

    res.status(healthy ? 200 : 503).json({
        success: healthy,
        api: 'ok',
        database: dbStates[state] || 'unknown'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);

// Serve the frontend from the same Express server in local/deployed mode.
// This also makes HttpOnly authentication cookies work cleanly.
app.use(express.static(path.join(__dirname, '..')));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
