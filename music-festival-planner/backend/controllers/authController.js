const jwt = require('jsonwebtoken');
const User = require('../models/user');
const AppError = require('../middleware/AppError');

// Pull the JWT signing secret from the environment, and stop everything if it's missing.
function getJwtSecret() {
  // Grab the secret key used to sign tokens from the server's environment settings.
  const secret = process.env.JWT_SECRET;
  // If no secret is configured, the server can't safely issue tokens, so throw an error.
  if (!secret) {
    throw new AppError('JWT_SECRET environment variable is not configured.', 500);
  }
  // Hand back the secret so it can be used for signing.
  return secret;
}

// Create a signed login token that encodes the user's identity and role.
function signToken(user) {
  // Build and return a JWT containing the user's ID, email, and role, valid for the configured period.
  return jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register
exports.register = async (req, res, next) => {
  // Pull the registration details out of the request body.
  const { email, password, role } = req.body;
  // Wrap everything in a try block so database errors don't crash the server.
  try {
    // Check whether anyone has already signed up with this email address.
    const existing = await User.findOne({ email });
    // If this email is already taken, stop and tell the caller it's a conflict.
    if (existing) return next(new AppError('Email already registered.', 409));

    // Build a new user record, defaulting to the 'user' role if none was provided.
    const user = new User({ email, password, role: role || 'user' });
    // Persist the new user to the database.
    await user.save();

    // Issue a login token so the user is immediately signed in after registering.
    const token = signToken(user);
    // Send back the token and the user's basic profile with a 201 Created status.
    res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    // Pass any unexpected errors along to the global error handler.
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  // Pull the submitted credentials out of the request body.
  const { email, password } = req.body;
  // Wrap everything in a try block so database errors don't crash the server.
  try {
    // Look up the account by email, explicitly asking the database to include the hashed password field.
    const user = await User.findOne({ email }).select('+password');
    // If no matching account exists, or the password is wrong, refuse access with a generic message.
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password.', 401));
    }

    // Credentials are correct, so create a fresh token for this session.
    const token = signToken(user);
    // Return the token and the user's basic profile to the caller.
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    // Pass any unexpected errors along to the global error handler.
    next(err);
  }
};

// GET /api/auth/me  (requires verifyToken middleware)
exports.me = (req, res) => {
  // The verifyToken middleware has already attached the user to the request, so just send it back.
  res.json({ user: req.user });
};
