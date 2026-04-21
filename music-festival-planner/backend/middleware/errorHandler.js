function errorHandler(err, req, res, next) {
  // Mongoose schema validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({ status: 400, message: 'Validation failed', errors });
  }

  // Mongoose CastError — bad ObjectId format
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 400,
      message: `Invalid value for '${err.path}': ${err.value}`,
    });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      status: 409,
      message: `Duplicate value: a record with this ${field} already exists.`,
    });
  }

  // Operational error created with AppError (known status)
  if (err.status) {
    return res.status(err.status).json({
      status: err.status,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Unexpected error — log details, hide internals in production
  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    status: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
}

module.exports = errorHandler;
