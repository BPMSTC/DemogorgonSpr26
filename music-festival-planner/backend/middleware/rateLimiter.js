// Library that counts requests per IP and blocks them when a limit is hit.
const rateLimit = require('express-rate-limit');

// Applied to all /api/* routes — general abuse protection.
// Allow up to 100 requests from the same IP within any 15-minute window.
const apiLimiter = rateLimit({
  // Set the rolling window to 15 minutes in milliseconds.
  windowMs: 15 * 60 * 1000,
  // Cap the number of requests allowed within that window.
  max: 100,
  // Send the modern RateLimit-* headers instead of the older X-RateLimit-* ones.
  standardHeaders: true,
  // Turn off the deprecated header format to keep responses clean.
  legacyHeaders: false,
  // Tell the blocked caller how long to wait before trying again.
  message: { status: 429, message: 'Too many requests, please try again after 15 minutes.' },
});

// Stricter limiter for auth endpoints — brute-force protection.
// Apply to POST /api/auth/* when auth routes are added.
// Allow up to 500 attempts within a 15-minute window before locking out the IP.
const authLimiter = rateLimit({
  // Use the same 15-minute window as the general limiter.
  windowMs: 15 * 60 * 1000,
  // Allow more attempts than the general limiter since auth is a high-frequency path.
  max: 500,
  // Use the current standard headers format.
  standardHeaders: true,
  // Disable the old-style headers.
  legacyHeaders: false,
  // Give the blocked caller a clear message about what happened.
  message: {
    status: 429,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
});

// Export both limiters so they can be applied to specific route groups in server.js.
module.exports = { apiLimiter, authLimiter };
