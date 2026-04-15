const test = require('node:test');
const assert = require('node:assert/strict');

// Use an isolated test database so automation does not affect dev data.
process.env.MONGODB_URI =
  process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/music-festival-planner-test';

const { connectToDatabase, disconnectFromDatabase } = require('../config/database');
const { Festival, Stage, Artist, Performance } = require('../models');

async function clearCollections() {
  await Promise.all([
    Performance.deleteMany({}),
    Stage.deleteMany({}),
    Artist.deleteMany({}),
    Festival.deleteMany({}),
  ]);
}

test.before(async () => {
  await connectToDatabase();
  await clearCollections();
  await Promise.all([
    Festival.syncIndexes(),
    Stage.syncIndexes(),
    Artist.syncIndexes(),
    Performance.syncIndexes(),
  ]);
});

test.after(async () => {
  await clearCollections();
  await disconnectFromDatabase();
});

test('creates and reads related festival, stage, artist, and performance records', async () => {
  const festival = await Festival.create({
    name: 'Integration Fest',
    location: 'Madison, WI',
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-02T23:59:59.000Z'),
  });

  const stage = await Stage.create({
    festival: festival._id,
    name: 'Main Integration Stage',
    environment: 'outdoor',
    capacity: 5000,
  });

  const artist = await Artist.create({
    name: 'Integration Artist',
    genre: 'Electronic',
  });

  const performance = await Performance.create({
    festival: festival._id,
    stage: stage._id,
    artist: artist._id,
    startDateTime: new Date('2026-08-01T18:00:00.000Z'),
    endDateTime: new Date('2026-08-01T19:00:00.000Z'),
  });

  const saved = await Performance.findById(performance._id)
    .populate('festival')
    .populate('stage')
    .populate('artist')
    .lean();

  assert.ok(saved, 'Expected saved performance to exist');
  assert.equal(saved.festival.name, 'Integration Fest');
  assert.equal(saved.stage.name, 'Main Integration Stage');
  assert.equal(saved.artist.name, 'Integration Artist');
});

test('supports update and delete operations in integration flow', async () => {
  const festival = await Festival.create({
    name: 'CRUD Fest',
    location: 'Milwaukee, WI',
    startDate: new Date('2026-08-10T00:00:00.000Z'),
    endDate: new Date('2026-08-11T23:59:59.000Z'),
  });

  const updatedFestival = await Festival.findByIdAndUpdate(
    festival._id,
    { $set: { location: 'Green Bay, WI' } },
    { new: true, runValidators: true },
  ).lean();

  assert.ok(updatedFestival, 'Expected updated festival to be returned');
  assert.equal(updatedFestival.location, 'Green Bay, WI');

  await Festival.deleteOne({ _id: festival._id });
  const deletedFestival = await Festival.findById(festival._id).lean();
  assert.equal(deletedFestival, null, 'Expected festival to be deleted');
});
