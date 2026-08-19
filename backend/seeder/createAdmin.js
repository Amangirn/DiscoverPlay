/**
 * Create or promote the first DiscoverPlay admin.
 *
 * Usage:
 *   node seeder/createAdmin.js "AmanGirn" "you@example.com" "StrongPassword123!"
 *
 * The password is hashed before it is stored.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { hashPassword } = require('../utils/auth');

async function run() {
    const [, , username, email, password] = process.argv;

    if (!username || !email || !password || password.length < 8) {
        console.error('Usage: node seeder/createAdmin.js "Username" "email@example.com" "Password8+"');
        process.exit(1);
    }

    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not configured.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const normalizedEmail = email.trim().toLowerCase();
    let user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (user) {
        user.username = username.trim();
        user.password = hashPassword(password);
        user.role = 'admin';
        await user.save();
        console.log(`Promoted ${normalizedEmail} to admin.`);
    } else {
        user = await User.create({
            username: username.trim(),
            email: normalizedEmail,
            password: hashPassword(password),
            role: 'admin'
        });
        console.log(`Created admin account: ${normalizedEmail}`);
    }

    await mongoose.disconnect();
}

run().catch(error => {
    console.error('Admin setup failed:', error.message);
    process.exit(1);
});
