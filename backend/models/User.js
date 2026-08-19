const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        minlength: 2,
        maxlength: 40
    },
    email: {
        type: String,
        required: [true, 'Email address is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        select: false
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    recentlyViewed: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
        default: [],
        validate: {
            validator: value => value.length <= 20,
            message: 'A maximum of 20 recently viewed games can be stored.'
        }
    },
    favoriteGames: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
        default: []
    },
    wishlistGames: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }],
        default: []
    }
}, {
    timestamps: true
});

userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
