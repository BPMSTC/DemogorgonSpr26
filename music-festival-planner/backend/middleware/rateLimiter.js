const rateLimit = require('express-rate-limit');

// Applied to all /api/* routes — general abuse protection.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: 'Too many requests, please try again after 15 minutes.' },
});

// Stricter limiter for auth endpoints — brute-force protection.
// Apply to POST /api/auth/* when auth routes are added.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
});

module.exports = { apiLimiter, authLimiter };
