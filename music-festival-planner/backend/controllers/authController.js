const jwt = require('jsonwebtoken');
const User = require('../models/user');
const AppError = require('../middleware/AppError');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET environment variable is not configured.', 500);
  }
  return secret;
}

function signToken(user) {
  return jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register
exports.register = async (req, res, next) => {
  const { email, password, role } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return next(new AppError('Email already registered.', 409));

    const user = new User({ email, password, role: role || 'user' });
    await user.save();

    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    console.log('[DEBUG login] email received:', JSON.stringify(email));
    console.log('[DEBUG login] password received:', JSON.stringify(password));
    const user = await User.findOne({ email }).select('+password');
    console.log('[DEBUG login] user found:', user ? user.email : 'null');
    if (user) {
      const match = await user.comparePassword(password);
      console.log('[DEBUG login] password match:', match);
      console.log('[DEBUG login] stored hash:', user.password);
    }
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password.', 401));
    }

    const token = signToken(user);
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  (requires verifyToken middleware)
exports.me = (req, res) => {
  res.json({ user: req.user });
};
