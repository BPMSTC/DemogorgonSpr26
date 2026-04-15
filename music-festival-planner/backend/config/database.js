const fs = require('fs');
const path = require('path');
const dns = require('dns');
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
const DEFAULT_DNS_FALLBACK_SERVERS = ['1.1.1.1', '8.8.8.8'];

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

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * @param {string | undefined} rawValue
 * @returns {string[]}
 */
function parseDnsFallbackServers(rawValue) {
  if (!rawValue || !String(rawValue).trim()) {
    return DEFAULT_DNS_FALLBACK_SERVERS;
  }

  return String(rawValue)
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
}

/**
 * @param {unknown} error
 * @param {string} mongoUri
 * @returns {boolean}
 */
function isAtlasSrvLookupError(error, mongoUri) {
  if (!mongoUri.startsWith('mongodb+srv://') || !error) {
    return false;
  }

  const err = /** @type {{ hostname?: string; syscall?: string }} */ (error);
  const srvHost = String(err.hostname || '');
  const isSrvSyscall = String(err.syscall || '').toLowerCase() === 'querysrv';
  const isSrvHost = srvHost.startsWith('_mongodb._tcp.');

  return isSrvSyscall || isSrvHost;
}

/**
 * @param {string} mongoUri
 * @returns {Promise<void>}
 */
async function connectWithUri(mongoUri) {
  // serverSelectionTimeoutMS avoids hanging too long on invalid/offline hosts.
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
}

async function connectToDatabase() {
  const mongoUri = getMongoUri();

  try {
    await connectWithUri(mongoUri);
  } catch (error) {
    if (!isAtlasSrvLookupError(error, mongoUri)) {
      throw error;
    }

    const dnsServers = parseDnsFallbackServers(process.env.MONGODB_DNS_FALLBACK_SERVERS);
    if (dnsServers.length === 0) {
      throw error;
    }

    dns.setServers(dnsServers);

    try {
      await connectWithUri(mongoUri);
      console.warn(
        `MongoDB SRV lookup succeeded after DNS fallback (${dnsServers.join(', ')}).`
      );
    } catch (retryError) {
      const enrichedError = new Error(
        `MongoDB SRV lookup failed using system DNS and fallback DNS servers (${dnsServers.join(', ')}). ` +
          `Initial error: ${getErrorMessage(error)}. Retry error: ${getErrorMessage(retryError)}`
      );
      enrichedError.cause = retryError;
      throw enrichedError;
    }
  }

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
