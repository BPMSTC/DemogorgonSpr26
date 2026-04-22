const crypto = require('crypto');

const STATE_TTL_MS = 10 * 60 * 1000;

function getStateSigningSecret() {
  return process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
}

function createSignature(encodedPayload, signingSecret) {
  return crypto.createHmac('sha256', signingSecret).update(encodedPayload).digest('base64url');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignedCalendarState({ performanceIds, deviceUserId, timezone }) {
  const signingSecret = getStateSigningSecret();
  if (!signingSecret) {
    throw new Error('Google OAuth signing secret is missing.');
  }

  const issuedAt = Date.now();
  const expiresAt = issuedAt + STATE_TTL_MS;
  const statePayload = {
    performanceIds,
    deviceUserId,
    timezone,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: issuedAt,
    exp: expiresAt,
  };

  const encodedPayload = Buffer.from(JSON.stringify(statePayload), 'utf8').toString('base64url');
  const signature = createSignature(encodedPayload, signingSecret);

  return `${encodedPayload}.${signature}`;
}

function verifySignedCalendarState(state) {
  const signingSecret = getStateSigningSecret();
  if (!signingSecret) {
    throw new Error('Google OAuth signing secret is missing.');
  }

  const [encodedPayload, signature] = String(state || '').split('.');
  if (!encodedPayload || !signature) {
    throw new Error('Invalid state format.');
  }

  const expectedSignature = createSignature(encodedPayload, signingSecret);
  if (!safeEqual(signature, expectedSignature)) {
    throw new Error('State signature validation failed.');
  }

  const decodedPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  if (!decodedPayload || typeof decodedPayload !== 'object') {
    throw new Error('State payload is invalid.');
  }

  if (!Array.isArray(decodedPayload.performanceIds) || decodedPayload.performanceIds.length === 0) {
    throw new Error('State payload does not include performance IDs.');
  }

  if (!decodedPayload.deviceUserId || !decodedPayload.timezone) {
    throw new Error('State payload is missing required fields.');
  }

  const expiresAt = Number(decodedPayload.exp);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    throw new Error('State has expired.');
  }

  return decodedPayload;
}

module.exports = {
  createSignedCalendarState,
  verifySignedCalendarState,
};