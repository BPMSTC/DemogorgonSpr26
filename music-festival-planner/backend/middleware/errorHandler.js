// Central place that catches every error thrown anywhere in the app and sends a tidy response.
function errorHandler(err, req, res, next) {
  // Mongoose schema validation error
  if (err.name === 'ValidationError') {
    // Collect each broken field into a simple list of field/message pairs.
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    // Tell the client exactly which fields failed and why.
    return res.status(400).json({ status: 400, message: 'Validation failed', errors });
  }

  // Mongoose CastError — bad ObjectId format
  if (err.name === 'CastError') {
    // The caller passed a value that cannot be converted to the expected database type.
    return res.status(400).json({
      status: 400,
      message: `Invalid value for '${err.path}': ${err.value}`,
    });
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    // Figure out which field caused the clash so the message is helpful.
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    // Let the caller know a record with that value already exists.
    return res.status(409).json({
      status: 409,
      message: `Duplicate value: a record with this ${field} already exists.`,
    });
  }

  // Operational error created with AppError (known status)
  if (err.status) {
    // The error was intentionally raised with a specific HTTP status, so echo it back.
    return res.status(err.status).json({
      status: err.status,
      message: err.message,
      // Include field-level errors only when they exist.
      ...(err.errors && { errors: err.errors }),
    });
  }

  // Unexpected error — log details, hide internals in production
  console.error('[Unhandled Error]', err);
  // In production, hide the raw error message so internal details are not leaked.
  return res.status(500).json({
    status: 500,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
  });
}

// Export the handler so it can be registered as the last middleware in the app.
module.exports = errorHandler;
