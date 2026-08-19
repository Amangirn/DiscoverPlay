const mongoose = require('mongoose');

const PLATFORMS = [
    'PC',
    'macOS',
    'Android',
    'iOS',
    'PlayStation',
    'Xbox',
    'Nintendo Switch',
    'XR / VR'
];

const storeLinkSchema = new mongoose.Schema(
    {
        store: {
            type: String,
            required: [true, 'Store name is required'],
            trim: true,
            maxlength: 80
        },
        url: {
            type: String,
            required: [true, 'Store URL is required'],
            trim: true,
            maxlength: 500
        }
    },
    { _id: false }
);

const gameSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Game title is required'],
            trim: true,
            minlength: 1,
            maxlength: 150
        },
        description: {
            type: String,
            required: [true, 'Game description is required'],
            trim: true,
            minlength: 1,
            maxlength: 5000
        },
        logoImage: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        coverImage: {
            type: String,
            trim: true,
            maxlength: 1000
        },
        screenshots: {
            type: [String],
            default: [],
            validate: {
                validator: value => value.length <= 10,
                message: 'Maximum 10 screenshots are allowed.'
            }
        },
        genre: {
            type: String,
            required: [true, 'Game genre is required'],
            trim: true,
            maxlength: 80
        },
        platforms: {
            type: [{
                type: String,
                enum: PLATFORMS
            }],
            default: []
        },
        developer: {
            type: String,
            trim: true,
            maxlength: 150
        },
        publisher: {
            type: String,
            trim: true,
            maxlength: 150
        },
        releaseDate: {
            type: Date
        },
        viewCount: {
            type: Number,
            default: 0,
            min: 0
        },
        featuredWeight: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        storeLinks: {
            type: [storeLinkSchema],
            default: [],
            validate: {
                validator: value => value.length <= 3,
                message: 'Maximum 3 store links are allowed.'
            }
        }
    },
    {
        timestamps: true
    }
);

// These indexes support the most common browse/discovery queries.
gameSchema.index({ createdAt: -1 });
gameSchema.index({ viewCount: -1, releaseDate: -1 });
gameSchema.index({ releaseDate: -1 });
gameSchema.index({ platforms: 1, releaseDate: -1 });
gameSchema.index({ genre: 1, platforms: 1 });

// Text search is useful for word-based searches. The controller also
// keeps a regex fallback for partial strings such as "cyber".
gameSchema.index({
    title: 'text',
    genre: 'text',
    developer: 'text',
    publisher: 'text'
});

module.exports = mongoose.model('Game', gameSchema);
