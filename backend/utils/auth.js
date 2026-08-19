const crypto = require('crypto');

const AUTH_COOKIE = 'discoverplay_token';
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

function getSecret() {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured. Add a strong random JWT_SECRET to your environment.');
    }
    return process.env.JWT_SECRET;
}

function base64url(value) {
    return Buffer.from(value).toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function signToken(payload) {
    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = base64url(JSON.stringify(payload));
    const data = `${header}.${body}`;
    const signature = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
    return `${data}.${signature}`;
}

function verifyToken(token) {
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const data = `${header}.${body}`;
    const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch {
        return null;
    }
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
    if (!stored || typeof stored !== 'string') return false;

    // Supports the new secure format. The legacy plaintext fallback exists only
    // so existing local users are not suddenly locked out; successful legacy
    // logins are re-hashed by the auth controller.
    if (!stored.startsWith('scrypt$')) {
        return stored === password;
    }

    const [, salt, expectedHex] = stored.split('$');
    if (!salt || !expectedHex) return false;

    const actual = crypto.scryptSync(password, salt, 64).toString('hex');
    const a = Buffer.from(actual, 'hex');
    const b = Buffer.from(expectedHex, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isLegacyPassword(stored) {
    return typeof stored === 'string' && !stored.startsWith('scrypt$');
}

function getCookie(req, name) {
    const header = req.headers.cookie;
    if (!header) return null;

    const item = header.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
    return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function setAuthCookie(res, token) {
    res.setHeader('Set-Cookie', `${AUTH_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${TOKEN_TTL_SECONDS}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

function clearAuthCookie(res) {
    res.setHeader('Set-Cookie', `${AUTH_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
}

function createAuthToken(user) {
    const now = Math.floor(Date.now() / 1000);
    return signToken({
        sub: String(user._id),
        email: user.email,
        role: user.role,
        iat: now,
        exp: now + TOKEN_TTL_SECONDS
    });
}

module.exports = {
    AUTH_COOKIE,
    hashPassword,
    verifyPassword,
    isLegacyPassword,
    getCookie,
    setAuthCookie,
    clearAuthCookie,
    createAuthToken,
    verifyToken
};
