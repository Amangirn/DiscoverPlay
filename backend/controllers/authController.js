const User = require('../models/User');
const {
    hashPassword,
    verifyPassword,
    isLegacyPassword,
    createAuthToken,
    setAuthCookie,
    clearAuthCookie
} = require('../utils/auth');

const publicUser = user => ({
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role
});

const validatePassword = password => typeof password === 'string' && password.length >= 8;

async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !validatePassword(password)) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and a password of at least 8 characters are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
        }

        const user = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            password: hashPassword(password),
            role: 'user'
        });

        const token = createAuthToken(user);
        setAuthCookie(res, token);

        return res.status(201).json({ success: true, user: publicUser(user) });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: 'An account with that email already exists.' });
        }
        console.error('Register error:', error);
        return res.status(500).json({ success: false, message: 'Could not create account.' });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
        if (!user || !verifyPassword(password, user.password)) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        if (isLegacyPassword(user.password)) {
            user.password = hashPassword(password);
            await user.save();
        }

        const token = createAuthToken(user);
        setAuthCookie(res, token);

        return res.json({ success: true, user: publicUser(user) });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Could not log in.' });
    }
}

async function me(req, res) {
    return res.json({ success: true, user: publicUser(req.user) });
}

async function logout(req, res) {
    clearAuthCookie(res);
    return res.json({ success: true, message: 'Logged out successfully.' });
}

module.exports = { register, login, me, logout };
