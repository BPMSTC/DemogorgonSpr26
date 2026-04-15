const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Festival = require('../models/festival');
const Stage = require('../models/stage');
const Artist = require('../models/artist');
const Performance = require('../models/performance');

test('Festival validates endDate >= startDate', () => {
  const invalidFestival = new Festival({
    name: 'Invalid Fest',
    location: 'Nowhere',
    startDate: new Date('2026-09-10T00:00:00.000Z'),
    endDate: new Date('2026-09-09T00:00:00.000Z'),
  });

  const error = invalidFestival.validateSync();
  assert.ok(error, 'Expected validation error for invalid festival dates');
  assert.ok(error.errors.endDate, 'Expected endDate validation error');
});

test('Stage validates environment enum values', () => {
  const stage = new Stage({
    festival: new mongoose.Types.ObjectId(),
    name: 'Side Stage',
    environment: 'floating',
    capacity: 1500,
  });

  const error = stage.validateSync();
  assert.ok(error, 'Expected validation error for invalid environment');
  assert.ok(error.errors.environment, 'Expected environment validation error');
});

test('Artist requires name and genre', () => {
  const artist = new Artist({ description: 'No required fields' });
  const error = artist.validateSync();

  assert.ok(error, 'Expected validation error for missing required fields');
  assert.ok(error.errors.name, 'Expected required validation error for name');
  assert.ok(error.errors.genre, 'Expected required validation error for genre');
});

test('Performance validates endDateTime after startDateTime and derives day', async () => {
  const performance = new Performance({
    festival: new mongoose.Types.ObjectId(),
    stage: new mongoose.Types.ObjectId(),
    artist: new mongoose.Types.ObjectId(),
    startDateTime: new Date('2026-07-18T20:00:00.000Z'),
    endDateTime: new Date('2026-07-18T19:00:00.000Z'),
  });

  const error = await performance.validate().catch((err) => err);
  assert.ok(error, 'Expected validation error when endDateTime is before startDateTime');
  assert.ok(error.errors.endDateTime, 'Expected endDateTime validation error');

  const validPerformance = new Performance({
    festival: new mongoose.Types.ObjectId(),
    stage: new mongoose.Types.ObjectId(),
    artist: new mongoose.Types.ObjectId(),
    startDateTime: new Date('2026-07-18T20:00:00.000Z'),
    endDateTime: new Date('2026-07-18T21:00:00.000Z'),
  });

  await validPerformance.validate();
  assert.ok(validPerformance.day instanceof Date, 'Expected day to be derived by middleware');
  assert.equal(validPerformance.day.toISOString(), '2026-07-18T00:00:00.000Z');
});
