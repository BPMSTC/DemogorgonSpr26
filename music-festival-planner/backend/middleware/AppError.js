class AppError extends Error {
  constructor(message, status = 500, errors = null) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors;
  }
}

module.exports = AppError;
