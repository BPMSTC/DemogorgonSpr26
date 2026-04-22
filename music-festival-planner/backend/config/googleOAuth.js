const { google } = require('googleapis');

const DEFAULT_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

function parseScopes(rawScopes) {
  if (!rawScopes || !String(rawScopes).trim()) {
    return DEFAULT_SCOPES;
  }

  return String(rawScopes)
    .split(/[\s,]+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
}

function getConfiguredScopes() {
  return parseScopes(process.env.GOOGLE_OAUTH_SCOPES);
}

function getOAuthConfig() {
  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || '',
  };
}

function isGoogleOAuthConfigured() {
  const config = getOAuthConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

function createGoogleOAuthClient() {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function createCalendarClient(oauthClient) {
  return google.calendar({ version: 'v3', auth: oauthClient });
}

module.exports = {
  createCalendarClient,
  createGoogleOAuthClient,
  getConfiguredScopes,
  isGoogleOAuthConfigured,
};