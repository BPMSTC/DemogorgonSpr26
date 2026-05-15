// Node built-ins for reading files, resolving paths, and querying DNS.
const fs = require('fs');
const path = require('path');
const dns = require('dns');
// Library for loading environment variables from a .env file into process.env.
const dotenv = require('dotenv');
// The database library used to connect to and query MongoDB.
const mongoose = require('mongoose');

// Safe fallback if no env file value is found.
const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/music_festival_planner';
// The default list of .env file locations to search when no explicit path is given.
const DEFAULT_ENV_FILES = [
  path.resolve(__dirname, '../.env'),
];
// Public DNS servers to try when the system's DNS fails to resolve an Atlas SRV record.
const DEFAULT_DNS_FALLBACK_SERVERS = ['1.1.1.1', '8.8.8.8'];

// Prevent dotenv from reloading the same env file repeatedly.
let isEnvLoaded = false;

function loadEnvironment() {
  // Skip loading if we already did it earlier in this process.
  if (isEnvLoaded) {
    return;
  }

  // Use an explicitly configured env file path when one is provided.
  const explicitEnvFile = process.env.MONGODB_ENV_FILE;
  if (explicitEnvFile) {
    // Load variables from that specific file and mark the work as done.
    dotenv.config({ path: explicitEnvFile });
    isEnvLoaded = true;
    return;
  }

  // Fall back to scanning the default list and loading the first file that exists.
  for (const envFile of DEFAULT_ENV_FILES) {
    if (fs.existsSync(envFile)) {
      // Load the first env file we find and stop looking.
      dotenv.config({ path: envFile });
      break;
    }
  }

  // Mark loading as complete so future calls are instant no-ops.
  isEnvLoaded = true;
}

function getMongoUri() {
  // Ensure environment variables are available before reading them.
  loadEnvironment();
  // Fall back to local MongoDB when no explicit URI is configured.
  return process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  // Return the built-in message property when we have a proper Error object.
  if (error instanceof Error) {
    return error.message;
  }
  // Coerce anything else — numbers, objects, etc. — to a string.
  return String(error);
}

/**
 * @param {string | undefined} rawValue
 * @returns {string[]}
 */
function parseDnsFallbackServers(rawValue) {
  // Use the built-in defaults when nothing was configured.
  if (!rawValue || !String(rawValue).trim()) {
    return DEFAULT_DNS_FALLBACK_SERVERS;
  }

  // Split the comma-separated list and drop any blank entries.
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
  // Non-Atlas URIs and empty errors can never be SRV lookup failures.
  if (!mongoUri.startsWith('mongodb+srv://') || !error) {
    return false;
  }

  // Extract the hostname and syscall fields that Node attaches to DNS errors.
  const err = /** @type {{ hostname?: string; syscall?: string }} */ (error);
  const srvHost = String(err.hostname || '');
  const isSrvSyscall = String(err.syscall || '').toLowerCase() === 'querysrv';
  // Atlas SRV hostnames always start with this prefix.
  const isSrvHost = srvHost.startsWith('_mongodb._tcp.');

  // Treat it as an SRV error when either indicator is present.
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
  // Resolve the URI from environment variables or the built-in default.
  const mongoUri = getMongoUri();

  try {
    // Attempt a direct connection with the resolved URI.
    await connectWithUri(mongoUri);
  } catch (error) {
    // If the failure is not an Atlas SRV DNS problem, re-throw immediately.
    if (!isAtlasSrvLookupError(error, mongoUri)) {
      throw error;
    }

    // Read the DNS fallback servers from config, defaulting to public resolvers.
    const dnsServers = parseDnsFallbackServers(process.env.MONGODB_DNS_FALLBACK_SERVERS);
    // If there are no fallback servers to try, give up.
    if (dnsServers.length === 0) {
      throw error;
    }

    // Override the system DNS so the retry uses our fallback resolvers.
    dns.setServers(dnsServers);

    try {
      // Try connecting again now that the DNS resolver has changed.
      await connectWithUri(mongoUri);
      console.warn(`MongoDB SRV lookup succeeded after DNS fallback (${dnsServers.join(', ')}).`);
    } catch (retryError) {
      // Both attempts failed — build a descriptive error that includes both failure reasons.
      const enrichedError = new Error(
        `MongoDB SRV lookup failed using system DNS and fallback DNS servers (${dnsServers.join(', ')}). ` +
          `Initial error: ${getErrorMessage(error)}. Retry error: ${getErrorMessage(retryError)}`,
      );
      // Attach the retry error as the cause for stack-trace debugging.
      enrichedError.cause = retryError;
      throw enrichedError;
    }
  }

  // Return active connection for scripts that need db metadata or ping.
  return mongoose.connection;
}

async function disconnectFromDatabase() {
  // readyState 0 means already disconnected, so skip the call to avoid an error.
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

// Expose the three functions that the rest of the app needs for database lifecycle management.
module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
  getMongoUri,
};
