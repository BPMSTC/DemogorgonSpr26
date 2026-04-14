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

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const connectDB          = require('./db');
const festivalsRouter    = require('./routes/festivals');
const stagesRouter       = require('./routes/stages');
const performancesRouter = require('./routes/performances');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware -------------------------------------------------------------

app.use(cors());
app.use(express.json());

// ---- Routes ----------------------------------------------------------------

app.use('/api/festivals',    festivalsRouter);
app.use('/api/stages',       stagesRouter);
app.use('/api/performances', performancesRouter);

// ---- Health check ----------------------------------------------------------

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ---- Start -----------------------------------------------------------------

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Music Festival Planner API listening on http://localhost:${PORT}`);
  });
});
