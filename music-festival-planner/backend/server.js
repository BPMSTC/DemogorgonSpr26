/**
 * Music Festival Planner – Express API server
 *
 * Quick start:
 *   1. cd music-festival-planner/backend
 *   2. cp .env.example .env          # add your MONGODB_URI
 *   3. npm install
 *   4. npm run dev                   # dev mode with auto-reload
 *      -- or --
 *      npm start                     # production
 *
 * The server listens on the PORT env variable (default 3000).
 */

// Node utility for building file-system paths in a cross-platform way.
const path = require('path');
// Library for loading .env files into process.env before anything else reads them.
const dotenv = require('dotenv');
// The web framework that handles routing, middleware, and HTTP responses.
const express = require('express');
// Middleware that adds the correct headers so browsers allow cross-origin requests.
const cors = require('cors');

// Load the project's .env file as early as possible so every module can see the variables.
dotenv.config({ path: path.join(__dirname, '.env') });

// Function that opens a connection to MongoDB before we start accepting requests.
const { connectToDatabase } = require('./config/database');
// Routers that group all the endpoints for each resource type.
const festivalsRouter = require('./routes/festivals');
const stagesRouter = require('./routes/stages');
const performancesRouter = require('./routes/performances');
const calendarRouter = require('./routes/calendar');
const authRouter = require('./routes/auth');

// Middleware that prints a one-line summary of every request to the console.
const requestLogger = require('./middleware/requestLogger');
// Rate limiters that cap how many requests a single IP can make in a time window.
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
// Handler that responds with 404 when no route matched the request.
const notFound = require('./middleware/notFound');
// Catch-all that turns any thrown error into a structured JSON response.
const errorHandler = require('./middleware/errorHandler');

// Create the main Express application instance.
const app = express();
// Use the configured port or fall back to 3000 for local development.
const PORT = process.env.PORT || 3000;
// Read the comma-separated list of origins that browsers are allowed to call from.
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
// Build the CORS policy: decide per-request whether to allow or reject the origin.
const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header (server-to-server, curl, health checks).
    if (ALLOWED_ORIGINS.length === 0 || !origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // Reject the request if the origin is not on the approved list.
    return callback(new Error('Not allowed by CORS'));
  },
  // List every HTTP method the API supports so browsers send the correct preflight.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // Allow only these two headers in incoming requests.
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ---- Middleware -------------------------------------------------------------

// Log every request before it reaches any route handler.
app.use(requestLogger);
// Apply the CORS policy to every incoming request.
app.use(cors(corsOptions));
// Parse JSON request bodies so controllers can read req.body as a plain object.
app.use(express.json());

// ---- Routes ----------------------------------------------------------------

// Serve a simple HTML landing page so the root URL gives useful feedback during development.
app.get('/', (_req, res) => {
  res.status(200).type('html').send(`
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Music Festival Planner API</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 2rem; line-height: 1.5; }
            h1 { margin-bottom: .5rem; }
            code { background: #f3f4f6; padding: .15rem .35rem; border-radius: 4px; }
            ul { padding-left: 1.25rem; }
          </style>
        </head>
        <body>
          <h1>🎵 Music Festival Planner API</h1>
          <p>The API is running successfully.</p>
          <p>Try these endpoints:</p>
          <ul>
            <li><a href="/health"><code>/health</code></a></li>
            <li><code>/api/festivals</code></li>
            <li><code>/api/stages</code></li>
            <li><code>/api/performances</code></li>
          </ul>
        </body>
      </html>
    `);
});

// Respond with a simple JSON status so load balancers and monitoring tools can check liveness.
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Apply the general rate limiter to every route under /api.
app.use('/api', apiLimiter);
// Apply the stricter auth limiter to login and register endpoints, but let /me through freely.
app.use(
  '/api/auth',
  (req, res, next) => {
    // The /me endpoint only reads a token that is already valid, so skip the brute-force limit.
    if (req.method === 'GET' && req.path === '/me') {
      return next();
    }
    // All other auth actions go through the stricter limiter.
    return authLimiter(req, res, next);
  },
  authRouter,
);
// Mount the festival, stage, performance, and calendar routers at their respective paths.
app.use('/api/festivals', festivalsRouter);
app.use('/api/stages', stagesRouter);
app.use('/api/performances', performancesRouter);
app.use('/api/calendar', calendarRouter);

// ---- Error handling --------------------------------------------------------

// Catch any request that did not match a route and forward a 404 error.
app.use(notFound);
// Turn every error (including the 404 above) into a structured JSON response.
app.use(errorHandler);

// ---- Start -----------------------------------------------------------------

// Open the database connection first, then start listening for HTTP requests.
connectToDatabase()
  .then(() => {
    // Begin accepting connections and confirm the address in the console.
    app.listen(PORT, () => {
      console.log(`Music Festival Planner API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    // If the database connection fails, log the reason and exit so the process manager can restart.
    console.error('Failed to start API server:', err.message);
    process.exit(1);
  });
