const crypto = require('crypto');

// How long a signed state token stays valid before it must be rejected.
const STATE_TTL_MS = 10 * 60 * 1000;

// Pull the signing secret from the environment so it never appears in source code.
function getStateSigningSecret() {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
}

// Produce an HMAC-SHA256 signature for the given payload string.
function createSignature(encodedPayload, signingSecret) {
  return crypto.createHmac('sha256', signingSecret).update(encodedPayload).digest('base64url');
}

// Compare two strings without leaking timing information that could be exploited.
function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  // Different lengths can never match, but we still avoid a short-circuit return.
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  // Use Node's constant-time comparison to prevent timing attacks.
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

// Build a tamper-proof state token that carries the user's OAuth session data.
function createSignedCalendarState({ performanceIds, deviceUserId, timezone }) {
  // Refuse to create tokens if the secret is absent — unsigned tokens would be useless.
  const signingSecret = getStateSigningSecret();
  if (!signingSecret) {
    throw new Error('Google OAuth signing secret is missing.');
  }

  // Record when the token was created and when it should stop being accepted.
  const issuedAt = Date.now();
  const expiresAt = issuedAt + STATE_TTL_MS;

  // Bundle all data the callback endpoint will need to continue the flow.
  const statePayload = {
    performanceIds,
    deviceUserId,
    timezone,
    // Random nonce makes each token unique even for identical inputs.
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: issuedAt,
    exp: expiresAt,
  };

  // Encode the payload as a URL-safe base64 string for safe transport in a URL parameter.
  const encodedPayload = Buffer.from(JSON.stringify(statePayload), 'utf8').toString('base64url');

  // Attach the signature so the callback can detect any tampering.
  const signature = createSignature(encodedPayload, signingSecret);

  // Return payload and signature joined by a dot, similar to a JWT structure.
  return `${encodedPayload}.${signature}`;
}

// Validate an incoming state token and return the decoded payload if everything checks out.
function verifySignedCalendarState(state) {
  // Verification requires the same secret used to create the token.
  const signingSecret = getStateSigningSecret();
  if (!signingSecret) {
    throw new Error('Google OAuth signing secret is missing.');
  }

  // Split into the two parts we expect — payload and signature.
  const [encodedPayload, signature] = String(state || '').split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Invalid state format.');
  }

  // Re-compute the expected signature and compare it to what was sent.
  const expectedSignature = createSignature(encodedPayload, signingSecret);
  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('State signature validation failed.');
  }

  // Decode the payload now that we know it has not been altered.
  const decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  if (!decodedPayload || typeof decodedPayload !== 'object') {
    throw new Error('State payload is invalid.');
  }

  // Confirm the payload carries the performance IDs we need to create calendar events.
  if (!Array.isArray(decodedPayload.performanceIds) || decodedPayload.performanceIds.length === 0) {
    throw new Error('State payload does not include performance IDs.');
  }

  // Both device user ID and timezone are required to finish the calendar export.
  if (!decodedPayload.deviceUserId || !decodedPayload.timezone) {
    throw new Error('State payload is missing required fields.');
  }

  // Reject the token if it was issued too long ago to prevent replay attacks.
  const expiresAt = Number(decodedPayload.exp);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    throw new Error('State has expired.');
  }

  // Hand back the verified data so the caller can proceed with the OAuth flow.
  return decodedPayload;
}

// Export both functions so calendar route handlers can create and verify state tokens.
module.exports = {
  createSignedCalendarState,
  verifySignedCalendarState,
};
