const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

test('fails fast on unreachable Mongo host (network/connection edge case)', async () => {
  const isolatedMongoose = new mongoose.Mongoose();

  await assert.rejects(async () => {
    await isolatedMongoose.connect('mongodb://127.0.0.1:1/unreachable-db', {
      serverSelectionTimeoutMS: 250,
      connectTimeoutMS: 250,
    });
  }, /ECONNREFUSED|Server selection timed out|connect ECONNREFUSED|failed to connect/i);

  if (isolatedMongoose.connection.readyState !== 0) {
    await isolatedMongoose.disconnect();
  }
});
