// A custom error type that carries an HTTP status code and optional field-level errors.
class AppError extends Error {
  // Accept a human-readable message, the HTTP status to send back, and any extra error details.
  constructor(message, status = 500, errors = null) {
    // Let the built-in Error class handle the message and stack trace.
    super(message);
    // Label this error so other code can tell it apart from unexpected system errors.
    this.name = 'AppError';
    // Store the HTTP status so the error handler knows what code to respond with.
    this.status = status;
    // Store any field-level validation errors if they were provided.
    this.errors = errors;
  }
}

// Make this class available to the rest of the application.
module.exports = AppError;
