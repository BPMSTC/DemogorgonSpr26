// Tools for verifying who a user is and whether they have elevated privileges.
const jwt = require('jsonwebtoken');
const AppError = require('./AppError');

// Check that the request carries a valid login token before allowing access.
function verifyToken(req, res, next) {
  // Pull the Authorization header from the incoming request.
  const authHeader = req.headers.authorization;
  // Reject the request early if there is no token or the format is wrong.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token required.', 401));
  }
  // Strip the "Bearer " prefix to get just the raw token string.
  const token = authHeader.slice(7);
  try {
    // Decode and verify the token, then attach the user payload to the request.
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    // Token is valid — let the request continue to the next handler.
    next();
  } catch {
    // The token was tampered with or has expired, so deny access.
    next(new AppError('Invalid or expired token.', 401));
  }
}

// Block any user who is not marked as an administrator.
function requireAdmin(req, res, next) {
  // Check the role that was decoded from the token by verifyToken.
  if (req.user?.role !== 'admin') {
    // The user is logged in but does not have permission to do this.
    return next(new AppError('Admin access required.', 403));
  }
  // The user is an admin — let the request proceed.
  next();
}

// Share both guards so they can be applied to any route that needs them.
module.exports = { verifyToken, requireAdmin };
