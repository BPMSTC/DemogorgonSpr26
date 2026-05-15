// Pull in the custom error class so we can attach an HTTP status to the error.
const AppError = require('./AppError');

// Catch any request that did not match a registered route and respond with 404.
function notFound(req, res, next) {
  // Pass an error that includes the method and URL so it is easy to debug.
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

// Make this handler available to be mounted at the end of the middleware stack.
module.exports = notFound;
