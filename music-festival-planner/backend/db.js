const mongoose = require('mongoose');

/**
 * Opens a Mongoose connection to MongoDB using the MONGODB_URI env variable.
 * Exits the process if the connection cannot be established so the API never
 * starts in a broken state.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Check your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
