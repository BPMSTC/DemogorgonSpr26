const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Safe default for local development if no env file value is found.
const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/music-festival-planner-dev';
// This points to the project-local env file that holds MONGODB_URI.
const DEFAULT_ENV_FILE = path.resolve(__dirname, '../music-festival-planner.env');

// Prevent dotenv from reloading the same env file repeatedly.
let isEnvLoaded = false;

function loadEnvironment() {
  // No-op when already loaded once in this process.
  if (isEnvLoaded) {
    return;
  }

  // Use a custom env path only if explicitly provided.
  dotenv.config({
    path: process.env.MONGODB_ENV_FILE || DEFAULT_ENV_FILE,
  });

  isEnvLoaded = true;
}

function getMongoUri() {
  // Ensure environment variables are available before reading them.
  loadEnvironment();
  // Fall back to default local URI so beginner setup still works quickly.
  return process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
}

async function connectToDatabase() {
  const mongoUri = getMongoUri();

  // serverSelectionTimeoutMS avoids hanging too long on invalid/offline hosts.
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  // Return active connection for scripts that need db metadata or ping.
  return mongoose.connection;
}

async function disconnectFromDatabase() {
  // readyState 0 means already disconnected.
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  getMongoUri,
};
