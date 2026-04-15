const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Safe fallback if no env file value is found.
const DEFAULT_MONGODB_URI =
  'mongodb+srv://darienmaverick_db_user:7wJUhmrICmd7Hndz@cluster0.rne3zjb.mongodb.net/?appName=Cluster0';
// Preferred backend env files (first one found wins). The primary default is .env.
const DEFAULT_ENV_FILES = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../.env.local'),
];

// Prevent dotenv from reloading the same env file repeatedly.
let isEnvLoaded = false;

function loadEnvironment() {
  // No-op when already loaded once in this process.
  if (isEnvLoaded) {
    return;
  }

  // Use explicit env path first if provided.
  const explicitEnvFile = process.env.MONGODB_ENV_FILE;
  if (explicitEnvFile) {
    dotenv.config({ path: explicitEnvFile });
    isEnvLoaded = true;
    return;
  }

  // Otherwise load the first default env file that exists.
  for (const envFile of DEFAULT_ENV_FILES) {
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile });
      break;
    }
  }

  isEnvLoaded = true;
}

function getMongoUri() {
  // Ensure environment variables are available before reading them.
  loadEnvironment();
  // Fall back to the Atlas URI so the default developer experience is consistent.
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
