// Google API client library used to create OAuth2 and Calendar service instances.
const { google } = require('googleapis');

// The calendar permission the app requests from the user by default.
const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function parseScopes(rawScopes) {
  // If no scopes were configured, return the built-in default permission set.
  if (!rawScopes || !String(rawScopes).trim()) {
    return DEFAULT_SCOPES;
  }

  // Split the raw string on spaces or commas and strip any blank entries.
  return String(rawScopes)
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function getConfiguredScopes() {
  // Read the scopes from the environment and convert the raw string to an array.
  return parseScopes(process.env.GOOGLE_OAUTH_SCOPES);
}

function getOAuthConfig() {
  // Pull the three required Google OAuth values from the environment, defaulting to empty strings if missing.
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
  };
}

function isGoogleOAuthConfigured() {
  // Load the current OAuth settings and verify all three required fields are present.
  const config = getOAuthConfig();
  // Return true only when every required field has a non-empty value.
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

function createGoogleOAuthClient() {
  // Pull the three credentials needed to build an OAuth2 client.
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  // Build and return an OAuth2 instance that handles token exchange with Google.
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function createCalendarClient(oauthClient) {
  // Wrap the authenticated OAuth client in a Google Calendar v3 service instance.
  return google.calendar({ version: 'v3', auth: oauthClient });
}

// Expose the functions other modules need to set up and use Google Calendar OAuth.
module.exports = {
  createCalendarClient,
  createGoogleOAuthClient,
  getConfiguredScopes,
  isGoogleOAuthConfigured,
};
