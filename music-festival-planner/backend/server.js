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

const express = require('express');
const cors = require('cors');

const { connectToDatabase } = require('./config/database');
const festivalsRouter = require('./routes/festivals');
const stagesRouter = require('./routes/stages');
const performancesRouter = require('./routes/performances');

const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header (server-to-server, curl, health checks).
    if (ALLOWED_ORIGINS.length === 0 || !origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ---- Middleware -------------------------------------------------------------

app.use(requestLogger);
app.use(cors(corsOptions));
app.use(express.json());

// ---- Routes ----------------------------------------------------------------

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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Rate-limit all API routes.
// Apply authLimiter (from middleware/rateLimiter.js) to POST /api/auth/* when auth routes are added.
app.use('/api', apiLimiter);
app.use('/api/festivals', festivalsRouter);
app.use('/api/stages', stagesRouter);
app.use('/api/performances', performancesRouter);

// ---- Error handling --------------------------------------------------------

app.use(notFound);
app.use(errorHandler);

// ---- Start -----------------------------------------------------------------

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Music Festival Planner API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start API server:', err.message);
    process.exit(1);
  });
