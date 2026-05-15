// Barrel export: lets scripts import all models from one place.
// Example: const { Festival, Stage, Artist, Performance } = require('../models');

// Load each model so this file can re-export them all together.
const Festival = require('./festival');
const Stage = require('./stage');
const Artist = require('./artist');
const Performance = require('./performance');
const GoogleCalendarToken = require('./googleCalendarToken');

// Make every model available through a single require path.
module.exports = {
  Festival,
  Stage,
  Artist,
  Performance,
  GoogleCalendarToken,
};
