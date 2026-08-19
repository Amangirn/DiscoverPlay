const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            console.warn('Warning: MONGODB_URI is not defined in environment variables.');
            return;
        }

        const conn = await mongoose.connect(uri, {
            // Options are no longer needed in Mongoose 6+, but kept clean
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
