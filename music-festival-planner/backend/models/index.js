// Barrel export: lets scripts import all models from one place.
// Example: const { Festival, Stage, Artist, Performance } = require('../models');
const Festival = require('./festival');
const Stage = require('./stage');
const Artist = require('./artist');
const Performance = require('./performance');

module.exports = {
  Festival,
  Stage,
  Artist,
  Performance,
};
