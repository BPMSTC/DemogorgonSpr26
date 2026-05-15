// Print a one-line summary of every HTTP request once the response has been sent.
function requestLogger(req, res, next) {
  // Record the moment the request arrived so we can calculate how long it took.
  const start = Date.now();
  // Wait until the response is fully sent before printing the log line.
  res.on('finish', () => {
    // Calculate how many milliseconds passed between arrival and the finished response.
    const ms = Date.now() - start;
    // Print the HTTP method, path, status code, and elapsed time to the console.
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  // Hand off to the next middleware so the request can actually be handled.
  next();
}

// Share the logger so it can be registered early in the middleware chain.
module.exports = requestLogger;
